package db

import (
	"context"
	"eclab/db/repositery"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type DB struct {
	pool *pgxpool.Pool
	*repositery.Queries
}

func New(url string) (DB, error) {
	ctx := context.Background()

	config, err := pgxpool.ParseConfig(url)
	if err != nil {
		return DB{}, err
	}

	config.MaxConns = 10
	config.MinConns = 1
	config.MaxConnLifetime = time.Hour

	pool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		return DB{}, err
	}

	return DB{
		pool:    pool,
		Queries: repositery.New(pool),
	}, nil
}

func (d *DB) Close() {
	d.pool.Close()
}
