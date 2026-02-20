package main

import (
	"eclab/db"
	"eclab/env"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/mail"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/joho/godotenv"
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
		Email	string `json:"email"`
		Password string `json:"password"`
	}

	router.Post("/auth/register", func(w http.ResponseWriter, r *http.Request) {
		var request AuthRequest
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			http.Error(w, "Invalid request payload", http.StatusBadRequest)
			return
		}


		fmt.Fprintln(w, "Register endpoint")
	})

	router.Post("/auth/login", func(w http.ResponseWriter, r *http.Request) {
		var request AuthRequest
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			http.Error(w, "Invalid request payload", http.StatusBadRequest)
			return
		}

		fmt.Fprintln(w, "Login endpoint")
	})

	router.Delete("/auth", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintln(w, "Delete auth endpoint")
	})



	fmt.Printf("Starting server on port %s\n", Env.PORT)
	http.ListenAndServe(Env.PORT, router)
}



func register(email string, password string) (*http.Cookie, error) {
	return nil, nil
}

func login(email string, password string) (*http.Cookie, error) {
	return nil, nil

}


func logout() (*http.Cookie, error){
	return nil, nil

}



func hashPassword(password string) (string, error) {
	
	return "", nil
}


func comparePasswords(hashedPassword string, password string) bool {
	return false
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