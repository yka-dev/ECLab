package main

import (
	"context"
	"eclab/db"
	"eclab/db/repositery"
	"eclab/env"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/mail"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"
)

var Env env.Env
var DB db.DB

func main() {
	godotenv.Load()

	Env, err := env.InitEnv()
	if err != nil {
		log.Fatal("Failed to load environment variables: ", err)
		return
	}

	DB, err = db.New(Env.DATABASE_URL)
	if err != nil {
		log.Fatal("Failed to connect to database: ", err)
		return
	}
	defer DB.Close()

	router := chi.NewRouter()

	type AuthRequest struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}

	router.HandleFunc("/auth/", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodPost:
			var request AuthRequest
			if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
				http.Error(w, "Invalid request payload", http.StatusBadRequest)
				return
			}

			email, err := validateEmail(request.Email)
			if err != nil {
				http.Error(w, "Invalid email address", http.StatusBadRequest)
				return
			}

			password, err := validatePassword(request.Password)
			if err != nil {
				http.Error(w, "Invalid password", http.StatusBadRequest)
				return
			}

			cookie := &http.Cookie{}
			path := r.URL.Query().Get("path")
			switch path {
			case "login":
				cookie, err = register(r.Context(), email, password)
				if err != nil {
					http.Error(w, "Failed to register: "+err.Error(), http.StatusInternalServerError)
					return
				}
			case "register":
				cookie, err = login(r.Context(), email, password)
				if err != nil {
					http.Error(w, "Invalid credentials", http.StatusUnauthorized)
					return
				}
			}

			w.Header().Set("Set-Cookie", cookie.String())
			w.WriteHeader(http.StatusOK)

		case http.MethodDelete:
			session, err := getSessionFromRequest(r)
			if err != nil {
				http.Error(w, "Unauthorized", http.StatusUnauthorized)
				return
			}

			cookie, err := logout(r.Context(), *session)
			if err != nil {
				http.Error(w, "Failed to logout", http.StatusInternalServerError)
				return
			}

			w.Header().Set("Set-Cookie", cookie.String())
			w.WriteHeader(http.StatusOK)

		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})

	router.HandleFunc("/project/", func(w http.ResponseWriter, r *http.Request) {
		session, err := getSessionFromRequest(r)
		if err != nil {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		switch r.Method {
		case http.MethodPost:
			var newProjectData struct {
				Name string `json:"name"`
			}

			if err := json.NewDecoder(r.Body).Decode(&newProjectData); err != nil {
				http.Error(w, "Invalid request payload", http.StatusBadRequest)
				return
			}

			project, err := DB.CreateProject(r.Context(), repositery.CreateProjectParams{
				Name:   newProjectData.Name,
				UserID: session.UserID,
			})

			if err != nil {
				http.Error(w, "Failed to create project", http.StatusInternalServerError)
				return
			}

			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(project)
		case http.MethodDelete:
			idStr := strings.TrimPrefix(r.URL.Path, "/project/")
			projectID, err := strconv.ParseInt(idStr, 10, 64)
			if err != nil {
				http.Error(w, "Invalid project id", http.StatusBadRequest)
				return
			}

			err = DB.DeleteProjectByID(r.Context(), repositery.DeleteProjectByIDParams{
				ID:     projectID,
				UserID: session.UserID,
			})

			if err != nil {
				http.Error(w, "Failed to delete project", http.StatusInternalServerError)
				return
			}
			w.WriteHeader(http.StatusOK)
		case http.MethodPatch:
			var updateProjectData struct {
				Name string `json:"name"`
			}

			if err := json.NewDecoder(r.Body).Decode(&updateProjectData); err != nil {
				http.Error(w, "Invalid request payload", http.StatusBadRequest)
				return
			}

			idStr := strings.TrimPrefix(r.URL.Path, "/project/")
			projectID, err := strconv.ParseInt(idStr, 10, 64)
			if err != nil {
				http.Error(w, "Invalid project id", http.StatusBadRequest)
				return
			}

			err = DB.UpdateProjectByID(r.Context(), repositery.UpdateProjectByIDParams{
				ID:     projectID,
				Name:   updateProjectData.Name,
				UserID: session.UserID,
			})

			if err != nil {
				http.Error(w, "Failed to update project", http.StatusInternalServerError)
				return
			}

			w.WriteHeader(http.StatusOK)

		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})

	fmt.Printf("Starting server on port %s\n", Env.PORT)
	http.ListenAndServe(Env.PORT, router)
}

func register(ctx context.Context, email string, password string) (*http.Cookie, error) {
	hashedPassword, err := hashPassword(password)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password")
	}

	_, err = DB.CreateUser(ctx, repositery.CreateUserParams{
		Email:        email,
		PasswordHash: hashedPassword,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create user")
	}

	cookie, err := login(ctx, email, password)
	if err != nil {
		return nil, fmt.Errorf("failed to login after registration")
	}

	return cookie, nil
}

func login(ctx context.Context, email string, password string) (*http.Cookie, error) {
	user, err := DB.GetUserByEmail(ctx, email)
	if err != nil {
		return nil, fmt.Errorf("invalid credentials")
	}

	if !comparePasswords(password, user.PasswordHash) {
		return nil, fmt.Errorf("invalid credentials")
	}

	session, err := DB.CreateSession(ctx, repositery.CreateSessionParams{
		UserID:    user.ID,
		ExpiresAt: time.Now().Add(7 * 24 * time.Hour),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create session")
	}

	return createAuthCookie(session.ID.String(), session.ExpiresAt), nil
}

func logout(ctx context.Context, session repositery.Session) (*http.Cookie, error) {
	err := DB.DeleteSessionByID(ctx, session.ID)
	cookie := createAuthCookie("", time.Now().Add(-time.Hour))

	return cookie, err
}

func createAuthCookie(value string, expiresAt time.Time) *http.Cookie {
	return &http.Cookie{
		Name:     "session_id",
		Value:    value,
		Expires:  expiresAt,
		HttpOnly: true,
		Secure:   true,
	}
}

func hashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(bytes), err
}

func comparePasswords(password string, hashedPassword string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(password))
	return err == nil
}

func validateEmail(email string) (string, error) {
	_, err := mail.ParseAddress(email)
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(strings.ToLower(email)), nil
}

func validatePassword(password string) (string, error) {
	if len(password) < 8 {
		return "", fmt.Errorf("password must be at least 8 characters long")
	}
	return strings.TrimSpace(password), nil
}

func getSessionFromRequest(r *http.Request) (*repositery.Session, error) {
	cookie, err := r.Cookie("session_id")
	if err != nil {
		return nil, fmt.Errorf("session cookie not found")
	}

	sessionID, err := uuid.Parse(cookie.Value)
	if err != nil {
		return nil, fmt.Errorf("invalid session ID")
	}
	session, err := DB.GetSessionByID(r.Context(), sessionID)
	if err != nil {
		return nil, fmt.Errorf("invalid session")
	}
	return &session, nil
}
