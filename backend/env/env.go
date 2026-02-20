package env


import (
	"log"
	"os"
	
	"github.com/joho/godotenv"
)

type Env struct {
	DATABASE_URL string
	PORT string
}

func InitEnv() (Env, error) {
	if err := godotenv.Load(); err != nil {
		log.Printf("Failed to load environnement variables : %s\n", err)
		return Env{}, err
	}

	return Env{
		DATABASE_URL:         os.Getenv("DATABASE_URL"),
		PORT:                 os.Getenv("PORT"),
	}, nil
}