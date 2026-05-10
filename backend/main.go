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

// Les dépendances globales sont déclarées ici pour être accessibles
// par toutes les fonctions auxiliaires (login, logout, etc.).
var Env env.Env
var DB db.DB
var Email email.Email

func main() {
	// godotenv.Load() est tolérant à l'absence du fichier .env (utile en production
	// où les variables sont injectées directement dans l'environnement du processus).
	godotenv.Load()

	Env, err := env.InitEnv()
	if err != nil {
		log.Fatal("Impossible de charger les variables d'environnement : ", err)
	}

	DB, err = db.New(Env.DATABASE_URL)
	if err != nil {
		log.Fatal("Impossible de se connecter a la base de donnees : ", err)
	}
	defer DB.Close()

	Email = email.New(Env.BREVO_API_KEY)

	router := chi.NewRouter()

	// CORS permissif : autorise toutes les origines et methodes.
	// A restreindre en production selon les domaines autorisés.
	router.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://*", "https://*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"*"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	registerAuthRoutes(router)
	registerProjectRoutes(router)

	log.Printf("Serveur en ecoute sur le port %s\n", Env.PORT)
	if err := http.ListenAndServe(Env.PORT, routeur); err != nil {
		log.Fatal("Erreur au demarrage du serveur : ", err)
	}
}

// RequeteAuth represente le corps JSON attendu pour la connexion et l'inscription.
type AuthRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// registerAuthRoutes regroupe toutes les routes liees a l'authentification.
// Les séparer de main() améliore la lisibilité et facilite les tests.
func registerAuthRoutes(r chi.Router) {
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("OK"))
	})

	// Deconnexion : invalide la session et efface le cookie cote client.
	r.Delete("/auth", func(w http.ResponseWriter, r *http.Request) {
		session, err := getSessionFromRequest(r)
		if err != nil {
			log.Printf("Deconnexion echouee, session invalide : %s\n", err)
			http.Error(w, "Non autorise", http.StatusUnauthorized)
			return
		}
		http.SetCookie(w, logout(r.Context(), session))
		w.WriteHeader(http.StatusOK)
	})

	// Route unifiee pour /auth/login et /auth/signup.
	// Le chemin determine l'action a effectuer.
	r.Post("/auth/*", func(w http.ResponseWriter, r *http.Request) {
		var req AuthRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			log.Printf("Corps de la requete auth invalide : %s\n", err)
			http.Error(w, "Corps de la requete invalide", http.StatusBadRequest)
			return
		}

		email, err := validateEmail(req.Email)
		if err != nil {
			log.Printf("Adresse courriel invalide %q : %s\n", req.Email, err)
			http.Error(w, "Adresse courriel invalide", http.StatusBadRequest)
			return
		}

		password, err := validatePassword(req.Password)
		if err != nil {
			log.Printf("Mot de passe invalide : %s\n", err)
			http.Error(w, "Mot de passe invalide", http.StatusBadRequest)
			return
		}

		var cookie *http.Cookie
		path := r.URL.Path

		switch {
		case strings.Contains(path, "login"):
			cookie, err = login(r.Context(), email, password)
			if err != nil {
				log.Printf("Connexion echouee pour %q : %s\n", email, err)
				http.Error(w, "Identifiants invalides", http.StatusUnauthorized)
				return
			}
		case strings.Contains(path, "signup"):
			cookie, err = signup(r.Context(), email, password)
			if err != nil {
				log.Printf("Inscription echouee pour %q : %s\n", email, err)
				http.Error(w, "Echec de l'inscription", http.StatusInternalServerError)
				return
			}
		default:
			http.Error(w, "Action non reconnue", http.StatusNotFound)
			return
		}

		http.SetCookie(w, cookie)
		w.WriteHeader(http.StatusOK)
	})

	// Etape 1 du flux "mot de passe oublie" : genere un token et envoie un email.
	r.Post("/auth/forgot", func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Email string `json:"email"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			log.Printf("Corps de la requete forgot invalide : %s\n", err)
			http.Error(w, "Donnees invalides", http.StatusBadRequest)
			return
		}

		email, err := validateEmail(req.Email)
		if err != nil {
			log.Printf("Adresse courriel invalide %q : %s\n", req.Email, err)
			http.Error(w, "Adresse courriel invalide", http.StatusBadRequest)
			return
		}

		user, err := DB.GetUserByEmail(r.Context(), email)
		if err != nil {
			// On renvoie une erreur generique pour ne pas révéler si l'email existe.
			log.Printf("Aucun utilisateur pour le courriel %q : %s\n", email, err)
			http.Error(w, "Adresse courriel invalide", http.StatusBadRequest)
			return
		}

		// Le token de réinitialisation est stocke en base avec une expiration de 3 heures.
		newReq, err := DB.CreateRequest(r.Context(), repositery.CreateRequestParams{
			Type:      repositery.RequestsTypeResetPassword,
			UserID:    user.ID,
			ExpiresAt: time.Now().Add(3 * time.Hour),
		})
		if err != nil {
			log.Printf("Echec de creation de la requete de reinitialisation pour l'utilisateur %d : %s\n", user.ID, err)
			http.Error(w, "Erreur interne du serveur", http.StatusInternalServerError)
			return
		}

		resetLink := fmt.Sprintf("%s/reset-password?token=%s", Env.URL, newReq.ID)
		if err := Email.SendPasswordResetEmail(r.Context(), user.Email, resetLink); err != nil {
			log.Printf("Echec de l'envoi de l'email de reinitialisation : %s\n", err)
			http.Error(w, "Erreur interne du serveur", http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusOK)
	})

	// Etape 2 du flux "mot de passe oublie" : valide le token et applique le nouveau mot de passe.
	r.Post("/auth/reset", func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			RequestID   uuid.UUID `json:"request_id"`
			NewPassword string    `json:"new_password"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			log.Printf("Corps de la requete reset invalide : %s\n", err)
			http.Error(w, "Corps de la requete invalide", http.StatusBadRequest)
			return
		}

		// Note : validerMotDePasse est appele ici, validerCourriel etait un bug dans l'original.
		newPassword, err := validatePassword(req.NewPassword)
		if err != nil {
			log.Printf("Nouveau mot de passe invalide : %s\n", err)
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		resetReq, err := DB.GetRequestByID(r.Context(), req.RequestID)
		if err != nil {
			log.Printf("Demande de reinitialisation %s introuvable : %s\n", req.RequestID, err)
			http.Error(w, "La demande de reinitialisation n'existe pas", http.StatusNotFound)
			return
		}

		// On vérifie l'expiration avant le type pour échouer rapidement et nettoyer la base.
		if resetReq.ExpiresAt.Before(time.Now()) {
			log.Printf("Demande de reinitialisation %s expiree\n", req.RequestID)
			DB.DeleteRequestByID(r.Context(), req.RequestID)
			http.Error(w, "La demande a expire", http.StatusRequestTimeout)
			return
		}

		if resetReq.Type != repositery.RequestsTypeResetPassword {
			log.Printf("Type de demande invalide %q pour la requete %s\n", resetReq.Type, req.RequestID)
			http.Error(w, "Demande invalide", http.StatusForbidden)
			return
		}

		passwordHash, err := hashPassword(newPassword)
		if err != nil {
			log.Printf("Echec du hachage du mot de passe : %s\n", err)
			http.Error(w, "Erreur interne du serveur", http.StatusInternalServerError)
			return
		}

		if err := DB.UpdateUserPassword(r.Context(), repositery.UpdateUserPasswordParams{
			ID:           resetReq.UserID,
			PasswordHash: passwordHash,
		}); err != nil {
			log.Printf("Echec de la mise a jour du mot de passe : %s\n", err)
			http.Error(w, "Erreur interne du serveur", http.StatusInternalServerError)
			return
		}

		// On invalide toutes les sessions existantes pour forcer une reconnexion
		// avec le nouveau mot de passe sur tous les appareils.
		DB.DeleteSessionsByUserID(r.Context(), resetReq.UserID)

		http.SetCookie(w, logout(r.Context(), nil))
		w.WriteHeader(http.StatusOK)
	})
}

// registerProjectRoutes regroupe toutes les routes CRUD liees aux projets.
func registerProjectRoutes(r chi.Router) {
	// Création d'un projet pour l'utilisateur authentifie.
	r.Post("/project", func(w http.ResponseWriter, r *http.Request) {
		session, err := getSessionFromRequest(r)
		if err != nil {
			log.Printf("Tentative de creation de projet non autorisee : %s\n", err)
			http.Error(w, "Non autorise", http.StatusUnauthorized)
			return
		}

		var req struct {
			Name string `json:"name"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			log.Printf("Corps du projet invalide : %s\n", err)
			http.Error(w, "Corps de la requete invalide", http.StatusBadRequest)
			return
		}

		project, err := DB.CreateProject(r.Context(), repositery.CreateProjectParams{
			Name:   req.Name,
			UserID: session.UserID,
		})
		if err != nil {
			log.Printf("Echec de la creation du projet pour l'utilisateur %d : %s\n", session.UserID, err)
			http.Error(w, "Echec de la creation du projet", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(project)
	})

	// Liste tous les projets appartenant a l'utilisateur authentifie.
	r.Get("/projects", func(w http.ResponseWriter, r *http.Request) {
		session, err := obtenirSessionDepuisRequete(r)
		if err != nil {
			log.Printf("Acces non autorise a la liste des projets : %s\n", err)
			http.Error(w, "Non autorise", http.StatusUnauthorized)
			return
		}

		projects, err := DB.GetProjectsByUserID(r.Context(), session.UserID)
		if err != nil {
			log.Printf("Echec de la recuperation des projets pour l'utilisateur %d : %s\n", session.UserID, err)
			http.Error(w, "Echec de la recuperation des projets", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(projects)
	})

	// Route generique pour GET / DELETE / PATCH sur un projet identifie par son ID.
	// Un seul handler evite la duplication de la logique d'authentification et de parsing d'ID.
	r.HandleFunc("/projects/{id}", func(w http.ResponseWriter, r *http.Request) {
		session, err := getSessionFromRequest(r)
		if err != nil {
			log.Printf("Acces non autorise au projet : %s\n", err)
			http.Error(w, "Non autorise", http.StatusUnauthorized)
			return
		}

		idStr := chi.URLParam(r, "id")
		projectID, err := strconv.ParseInt(idStr, 10, 64)
		if err != nil {
			log.Printf("ID de projet invalide %q : %s\n", idStr, err)
			http.Error(w, "ID de projet invalide", http.StatusBadRequest)
			return
		}

		switch r.Method {
		case http.MethodGet:
			project, err := DB.GetProjectByID(r.Context(), repositery.GetProjectByIDParams{
				ID:     projectID,
				UserID: session.UserID,
			})
			if err != nil {
				log.Printf("Echec de la recuperation du projet %d pour l'utilisateur %d : %s\n", projectID, session.UserID, err)
				http.Error(w, "Echec de la recuperation du projet", http.StatusInternalServerError)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(project)

		case http.MethodDelete:
			if err := DB.DeleteProjectByID(r.Context(), repositery.DeleteProjectByIDParams{
				ID:     projectID,
				UserID: session.UserID,
			}); err != nil {
				log.Printf("Echec de la suppression du projet %d pour l'utilisateur %d : %s\n", projectID, session.UserID, err)
				http.Error(w, "Echec de la suppression du projet", http.StatusInternalServerError)
				return
			}
			w.WriteHeader(http.StatusOK)

		case http.MethodPatch:
			var req struct {
				Name string `json:"name"`
			}
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				log.Printf("Corps de mise a jour du projet invalide : %s\n", err)
				http.Error(w, "Corps de la requete invalide", http.StatusBadRequest)
				return
			}
			if err := DB.UpdateProjectByID(r.Context(), repositery.UpdateProjectByIDParams{
				ID:     projectID,
				Name:   req.Name,
				UserID: session.UserID,
			}); err != nil {
				log.Printf("Echec de la mise a jour du projet %d pour l'utilisateur %d : %s\n", projectID, session.UserID, err)
				http.Error(w, "Echec de la mise a jour du projet", http.StatusInternalServerError)
				return
			}
			w.WriteHeader(http.StatusOK)

		default:
			http.Error(w, "Methode non autorisee", http.StatusMethodNotAllowed)
		}
	})

	// Mise a jour du schema de circuit (donnees JSON libres) d'un projet.
	r.Post("/projects/circuit/{id}", func(w http.ResponseWriter, r *http.Request) {
		session, err := getSessionFromRequest(r)
		if err != nil {
			log.Printf("Tentative de mise a jour du circuit non autorisee : %s\n", err)
			http.Error(w, "Non autorise", http.StatusUnauthorized)
			return
		}

		var req struct {
			Circuit json.RawMessage `json:"circuit"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			log.Printf("Corps de la mise a jour du circuit invalide : %s\n", err)
			http.Error(w, "Corps de la requete invalide", http.StatusBadRequest)
			return
		}

		idStr := chi.URLParam(r, "id")
		projectID, err := strconv.ParseInt(idStr, 10, 64)
		if err != nil {
			log.Printf("ID de projet invalide %q : %s\n", idStr, err)
			http.Error(w, "ID de projet invalide", http.StatusBadRequest)
			return
		}

		if err := DB.UpdateProjectCircuitByID(r.Context(), repositery.UpdateProjectCircuitByIDParams{
			ID:      projectID,
			Circuit: req.Circuit,
			UserID:  session.UserID,
		}); err != nil {
			log.Printf("Echec de la mise a jour du circuit pour le projet %d, utilisateur %d : %s\n", projectID, session.UserID, err)
			http.Error(w, "Echec de la mise a jour du circuit", http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusOK)
	})
}

// signup cree un nouvel utilisateur en base, puis l'authentifie immediatement.
func signup(ctx context.Context, email string, password string) (*http.Cookie, error) {
	passwordHash, err := hashPassword(password)
	if err != nil {
		return nil, fmt.Errorf("echec du hachage du mot de passe : %w", err)
	}

	if _, err = DB.CreateUser(ctx, repositery.CreateUserParams{
		Email:        email,
		PasswordHash: passwordHash,
	}); err != nil {
		return nil, fmt.Errorf("echec de la creation de l'utilisateur : %w", err)
	}

	// On connecte directement l'utilisateur apres inscription pour eviter une etape supplementaire.
	return login(ctx, email, password)
}

// login verifie les identifiants, cree une session valide 7 jours et retourne le cookie.
func login(ctx context.Context, email string, password string) (*http.Cookie, error) {
	user, err := DB.GetUserByEmail(ctx, email)
	if err != nil {
		return nil, fmt.Errorf("identifiants invalides")
	}

	if !compareHashAndPassword(password, user.PasswordHash) {
		return nil, fmt.Errorf("identifiants invalides")
	}

	session, err := DB.CreateSession(ctx, repositery.CreateSessionParams{
		UserID:    user.ID,
		ExpiresAt: time.Now().Add(7 * 24 * time.Hour),
	})
	if err != nil {
		return nil, fmt.Errorf("echec de la creation de la session : %w", err)
	}

	return createAuthCookie(session.ID.String(), session.ExpiresAt), nil
}

// logout supprime la session en base si elle existe, puis retourne un cookie expire
// pour que le navigateur efface immediatement le cookie cote client.
func logout(ctx context.Context, session *repositery.Session) *http.Cookie {
	if session != nil {
		DB.DeleteSessionByID(ctx, session.ID)
	}
	return createAuthCookie("", time.Now().Add(-time.Hour))
}

// createAuthCookie construit le cookie de session avec les attributs de securite requis.
// HttpOnly empeche l'acces via JavaScript. Secure force HTTPS. SameSiteNone permet
// les requetes cross-site (necessaire si le frontend est sur un domaine different).
func createAuthCookie(valeur string, expiration time.Time) *http.Cookie {
	return &http.Cookie{
		Name:     "eclab_session_id",
		Value:    valeur,
		Path:     "/",
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteNoneMode,
		Expires:  expiration,
	}
}

// hashPassword genere un hash bcrypt avec le cout par defaut.
// bcrypt inclut le sel automatiquement dans le hash resultant.
func hashPassword(motDePasse string) (string, error) {
	octets, err := bcrypt.GenerateFromPassword([]byte(motDePasse), bcrypt.DefaultCost)
	return string(octets), err
}

// compareHashAndPassword verifie si un mot de passe en clair correspond a son hash bcrypt.
// Le retour booleen simplifie les conditions d'appel.
func compareHashAndPassword(password string, passwordHash string) bool {
	return bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(password)) == nil
}

// validateEmail parse l'adresse via la bibliotheque standard (RFC 5322)
// et la normalise en minuscules sans espaces superflus.
func validateEmail(email string) (string, error) {
	if _, err := mail.ParseAddress(courriel); err != nil {
		return "", err
	}
	return strings.TrimSpace(strings.ToLower(courriel)), nil
}

// validatePassword applique les regles minimales de securite sur le mot de passe.
func validatePassword(password string) (string, error) {
	if len(password) < 8 {
		return "", fmt.Errorf("le mot de passe doit contenir au moins 8 caracteres")
	}
	return strings.TrimSpace(password), nil
}

// getSessionFromRequest extrait l'ID de session du cookie, puis valide
// la session en base. Retourne une erreur si le cookie est absent ou la session invalide.
func getSessionFromRequest(r *http.Request) (*repositery.Session, error) {
	cookie, err := r.Cookie("eclab_session_id")
	if err != nil {
		return nil, fmt.Errorf("cookie de session absent")
	}

	sessionID, err := uuid.Parse(cookie.Value)
	if err != nil {
		return nil, fmt.Errorf("ID de session invalide")
	}

	session, err := DB.GetSessionByID(r.Context(), sessionID)
	if err != nil {
		return nil, fmt.Errorf("session invalide")
	}

	return &session, nil
}
