package main

import (
	"fmt"
	"net/http"

	"github.com/go-chi/chi/v5"
)

const PORT = ":8080"

func main() {
	router := chi.NewRouter()

	router.Get("/", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintln(w, "Hello World")
	})

	fmt.Printf("Starting server on port %s\n", PORT)
	http.ListenAndServe(PORT, router)
}
