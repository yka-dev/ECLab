package main

import (
	"eclab/db"
	"eclab/env"
	"fmt"
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/joho/godotenv"
)

const PORT = ":8080"

func main() {
	godotenv.Load()

	Env, err := env.InitEnv()
	if err != nil {
		log.Fatal("Failed to load environment variables: ", err)
		return
	}

	DB, err := db.New(Env.DATABASE_URL)
	if err != nil {
		log.Fatal("Failed to connect to database: ", err)
		return
	}
	defer DB.Close()
	 
	router := chi.NewRouter()

	router.Get("/", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintln(w, "Hello World")
	})

	fmt.Printf("Starting server on port %s\n", PORT)
	http.ListenAndServe(Env.PORT, router)
}
