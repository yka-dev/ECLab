package env

import (
	"errors"
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Env struct {
	DATABASE_URL  string
	PORT          string
	BREVO_API_KEY string
	URL           string
}

func InitEnv() (Env, error) {
	if err := godotenv.Load(); err != nil {
		log.Printf("Failed to load local environnement variables : %s\n", err)
	}

	env := Env{
		DATABASE_URL:  os.Getenv("DATABASE_URL"),
		PORT:          os.Getenv("PORT"),
		BREVO_API_KEY: os.Getenv("BREVO_API_KEY"),
		URL:           os.Getenv("URL"),
	}

	if env.URL == "" {
		return Env{}, errors.New("failed to load env variables")
	}

	return env, nil
}
