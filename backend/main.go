package main

import (
	"context"
	"eclab/db"
	"eclab/db/repositery"
	"eclab/email"
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
	"github.com/go-chi/cors"
	"github.com/google/uuid"
	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"
)

var Env env.Env
var DB db.DB
var Email email.Email

func main() {
	// Charge les variables d'environnement depuis .env (si présent)
	godotenv.Load()

	// Initialise la configuration (Env) depuis l'environnement
	Env, err := env.InitEnv()
	if err != nil {
		log.Fatal("Failed to load environment variables: ", err)
		return
	}

	// Connexion à la base de données
	DB, err = db.New(Env.DATABASE_URL)
	if err != nil {
		log.Fatal("Failed to connect to database: ", err)
		return
	}
	defer DB.Close()

	// Initialise le client email (ex: Brevo)
	Email = email.New(Env.BREVO_API_KEY)

	// Configure le routeur HTTP et CORS
	router := chi.NewRouter()
	router.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:5173", "http://127.0.0.1:5173"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Représentation simple des payloads d'auth
	type AuthRequest struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}

	// Route unique pour login/signup/logout (méthodes POST/GET/DELETE selon usage)
	router.HandleFunc("/auth", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodPost, http.MethodGet:
			var request AuthRequest
			if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
				http.Error(w, "Invalid request payload", http.StatusBadRequest)
				return
			}

			// Validation et normalisation de l'email
			email, err := validateEmail(request.Email)
			if err != nil {
				http.Error(w, "Invalid email address", http.StatusBadRequest)
				return
			}

			// Validation du mot de passe (longueur minimale)
			password, err := validatePassword(request.Password)
			if err != nil {
				http.Error(w, "Invalid password", http.StatusBadRequest)
				return
			}

			cookie := &http.Cookie{}
			// Détermine l'action selon le chemin (login vs signup)
			if strings.Contains(r.URL.Path, "login") {
				cookie, err = login(r.Context(), email, password)
				if err != nil {
					http.Error(w, "Invalid credentials", http.StatusInternalServerError)
					return
				}
			} else if strings.Contains(r.URL.Path, "signup") {
				cookie, err = signup(r.Context(), email, password)
				if err != nil {
					http.Error(w, "Failed to signup", http.StatusUnauthorized)
					return
				}
			}

			// Retourne le cookie de session
			w.Header().Set("Set-Cookie", cookie.String())
			w.WriteHeader(http.StatusOK)

		case http.MethodDelete:
			// Déconnexion : récupère la session et la supprime
			session, err := getSessionFromRequest(r)
			if err != nil {
				http.Error(w, "Unauthorized", http.StatusUnauthorized)
				return
			}

			cookie := logout(r.Context(), session)

			w.Header().Set("Set-Cookie", cookie.String())
			w.WriteHeader(http.StatusOK)

		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})

	// Route pour demander un email de réinitialisation (forgot password)
	router.Post("/auth/forgot", func(w http.ResponseWriter, r *http.Request) {
		var request struct {
			Email string `json:"email"`
		}

		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			log.Printf("Failed to decode request body: %s\n", err)
			http.Error(w, "Invalid input", http.StatusBadRequest)
			return
		}

		email, err := validateEmail(request.Email)
		if err != nil {
			http.Error(w, "Invalid email address", http.StatusBadRequest)
			return
		}

		user, err := DB.GetUserByEmail(r.Context(), email)
		if err != nil {
			http.Error(w, "Invalid email address", http.StatusBadRequest)
			return
		}

		// Crée une requête de réinitialisation en base (avec date d'expiration)
		newRequest, err := DB.CreateRequest(r.Context(), repositery.CreateRequestParams{
			Type:      repositery.RequestsTypeResetPassword,
			UserID:    user.ID,
			ExpiresAt: time.Now().Add(time.Hour * 3), // Expires in 3 hours
		})
		if err != nil {
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}

		// Envoie l'email de réinitialisation contenant un lien avec le token
		if err := Email.SendPasswordResetEmail(r.Context(), user.Email, fmt.Sprintf("%s/reset-password?token=%s", Env.URL, newRequest.ID)); err != nil {
			log.Printf("Failed to send password reset email : %s\n", err)
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusOK)
	})

	// Route pour appliquer la réinitialisation du mot de passe
	router.Post("/auth/reset", func(w http.ResponseWriter, r *http.Request) {
		var request struct {
			RequestID   uuid.UUID `json:"request_id"`
			NewPassword string    `json:"new_password"`
		}

		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			log.Printf("Failed to parse request body: %s\n", err)
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		newPassword, err := validateEmail(request.NewPassword)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		newRequest, err := DB.GetRequestByID(r.Context(), request.RequestID)
		if err != nil {
			http.Error(w, "The password reset request does not exist", http.StatusNotFound)
			return
		}

		// Vérifie l'expiration du token
		if newRequest.ExpiresAt.Before(time.Now()) {
			DB.DeleteRequestByID(r.Context(), request.RequestID)
			http.Error(w, "The request has expired", http.StatusRequestTimeout)
			return
		}

		if newRequest.Type != repositery.RequestsTypeResetPassword {
			http.Error(w, "Invalid request", http.StatusForbidden)
			return
		}

		// Met à jour le mot de passe utilisateur
		newPasswordHash, err := hashPassword(newPassword)
		if err != nil {
			log.Printf("Failed to hash new password : %s\n", err)
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}

		if err := DB.UpdateUserPassword(r.Context(), repositery.UpdateUserPasswordParams{
			ID:           newRequest.UserID,
			PasswordHash: newPasswordHash,
		}); err != nil {
			log.Printf("Failed to update user password: %s\n", err)
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}

		// Supprime toutes les sessions de l'utilisateur pour forcer la reconnexion
		DB.DeleteSessionsByUserID(r.Context(), newRequest.UserID)

		cookie := logout(r.Context(), nil)
		http.SetCookie(w, cookie)
		w.WriteHeader(http.StatusOK)
	})

	// CRUD projets : création et liste
	router.Post("/project", func(w http.ResponseWriter, r *http.Request) {
		session, err := getSessionFromRequest(r)
		if err != nil {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

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
	})

	router.Get("/projects", func(w http.ResponseWriter, r *http.Request) {
		session, err := getSessionFromRequest(r)
		if err != nil {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		projects, err := DB.GetProjectsByUserID(r.Context(), session.UserID)
		if err != nil {
			http.Error(w, "Failed to get projects", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(projects)
	})

	// Routes pour manipuler un projet par id (GET/DELETE/PATCH)
	router.HandleFunc("/project/{id}", func(w http.ResponseWriter, r *http.Request) {
		session, err := getSessionFromRequest(r)
		if err != nil {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		idStr := chi.URLParam(r, "id")
		projectID, err := strconv.ParseInt(idStr, 10, 64)
		if err != nil {
			http.Error(w, "Invalid project id", http.StatusBadRequest)
			return
		}

		switch r.Method {
		case http.MethodGet:
			project, err := DB.GetProjectByID(r.Context(), repositery.GetProjectByIDParams{
				ID:     projectID,
				UserID: session.UserID,
			})

			if err != nil {
				http.Error(w, "Failed to get project", http.StatusInternalServerError)
				return
			}

			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(project)
		case http.MethodDelete:
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

	// Mettre à jour le circuit d'un projet
	router.Post("/project/circuit/{id}", func(w http.ResponseWriter, r *http.Request) {
		session, err := getSessionFromRequest(r)
		if err != nil {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		var updateProjectCircuitData struct {
			Circuit []byte `json:"circuit"`
		}

		if err := json.NewDecoder(r.Body).Decode(&updateProjectCircuitData); err != nil {
			http.Error(w, "Invalid request payload", http.StatusBadRequest)
			return
		}

		idStr := chi.URLParam(r, "id")

		projectID, err := strconv.ParseInt(idStr, 10, 64)
		if err != nil {
			http.Error(w, "Invalid project id", http.StatusBadRequest)
			return
		}

		err = DB.UpdateProjectCircuitByID(r.Context(), repositery.UpdateProjectCircuitByIDParams{
			ID:      projectID,
			Circuit: updateProjectCircuitData.Circuit,
			UserID:  session.UserID,
		})

		if err != nil {
			http.Error(w, "Failed to update project circuit", http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusOK)
	})

	// Démarrage du serveur HTTP
	fmt.Printf("Starting server on port %s\n", Env.PORT)
	http.ListenAndServe(Env.PORT, router)
}

// signup crée un nouvel utilisateur puis retourne un cookie de session.
func signup(ctx context.Context, email string, password string) (*http.Cookie, error) {
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

// login valide les identifiants, crée une session en base et retourne un cookie.
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

// logout supprime la session fournie (si présente) et retourne un cookie expiré.
func logout(ctx context.Context, session *repositery.Session) *http.Cookie {
	if session != nil {
		DB.DeleteSessionByID(ctx, session.ID)
	}
	cookie := createAuthCookie("", time.Now().Add(-time.Hour))

	return cookie
}

// createAuthCookie génère un cookie de session avec la valeur et la date d'expiration fournies.
func createAuthCookie(value string, expiresAt time.Time) *http.Cookie {
	return &http.Cookie{
		Name:     "eclab_session_id",
		Value:    value,
		Expires:  expiresAt,
		HttpOnly: false,
		Secure:   true,
	}
}

// hashPassword génère un hash bcrypt pour un mot de passe en clair.
func hashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(bytes), err
}

// comparePasswords compare un mot de passe en clair avec son hash bcrypt.
func comparePasswords(password string, hashedPassword string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(password))
	return err == nil
}

// validateEmail vérifie la validité d'une adresse email et la normalise.
func validateEmail(email string) (string, error) {
	_, err := mail.ParseAddress(email)
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(strings.ToLower(email)), nil
}

// validatePassword applique des règles simples sur le mot de passe (longueur minimale).
func validatePassword(password string) (string, error) {
	if len(password) < 8 {
		return "", fmt.Errorf("password must be at least 8 characters long")
	}
	return strings.TrimSpace(password), nil
}

// getSessionFromRequest récupère la session à partir du cookie de la requête et la valide en base.
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
