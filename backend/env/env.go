package env

import (
	"fmt"
	"os"
)

// Env regroupe toutes les variables d'environnement requises par l'application.
// Chaque champ correspond a une variable d'environnement du meme nom.
type Env struct {
	DATABASE_URL  string
	PORT          string
	BREVO_API_KEY string
	URL           string
}

// InitEnv lit les variables d'environnement et retourne une configuration validee.
// Le chargement du fichier .env est gere en amont dans main() via godotenv.Load(),
// ce package se concentre uniquement sur la lecture et la validation.
func InitEnv() (Env, error) {
	env := Env{
		DATABASE_URL:  os.Getenv("DATABASE_URL"),
		PORT:          os.Getenv("PORT"),
		BREVO_API_KEY: os.Getenv("BREVO_API_KEY"),
		URL:           os.Getenv("URL"),
	}

	// On valide chaque champ obligatoire pour signaler precisement
	// quelle variable est manquante au lieu d'un message generique.
	champs := []struct {
		nom   string
		valeur string
	}{
		{"DATABASE_URL", env.DATABASE_URL},
		{"PORT", env.PORT},
		{"BREVO_API_KEY", env.BREVO_API_KEY},
		{"URL", env.URL},
	}

	for _, champ := range champs {
		if champ.valeur == "" {
			return Env{}, fmt.Errorf("variable d'environnement manquante : %s", champ.nom)
		}
	}

	return env, nil
}
