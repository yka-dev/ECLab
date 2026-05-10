package db

import (
	"context"
	"eclab/db/repositery"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Les constantes du pool de connexions sont extraites pour faciliter leur ajustement
// sans avoir a fouiller dans la logique d'initialisation.
const (
	poolMaxConnexions     = 10
	poolMinConnexions     = 1
	dureeVieMaxConnexion  = time.Hour
)

// DB encapsule le pool de connexions PostgreSQL et expose les requetes SQL generees
// par sqlc via l'integration de repositery.Queries.
// L'integration (embedding) permet d'appeler directement db.GetUserByEmail(...)
// sans passer par db.Queries.GetUserByEmail(...).
type DB struct {
	pool *pgxpool.Pool
	*repositery.Queries
}

// New etablit un pool de connexions vers la base PostgreSQL et verifie
// que la base est joignable avant de retourner.
func New(url string) (DB, error) {
	ctx := context.Background()

	config, err := pgxpool.ParseConfig(url)
	if err != nil {
		return DB{}, fmt.Errorf("configuration du pool invalide : %w", err)
	}

	config.MaxConns        = poolMaxConnexions
	config.MinConns        = poolMinConnexions
	config.MaxConnLifetime = dureeVieMaxConnexion

	pool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		return DB{}, fmt.Errorf("impossible de creer le pool de connexions : %w", err)
	}

	// Ping explicite pour detecter immediatement un probleme de connectivite
	// (mauvaise URL, base inaccessible) plutot qu'a la premiere requete.
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return DB{}, fmt.Errorf("impossible de joindre la base de donnees : %w", err)
	}

	return DB{
		pool:    pool,
		Queries: repositery.New(pool),
	}, nil
}

// Close libere toutes les connexions du pool. A appeler via defer dans main().
func (d *DB) Close() {
	d.pool.Close()
}
