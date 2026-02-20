package db

import (
	"context"
	"eclab/db/repositery"

	"github.com/jackc/pgx/v5"
)

type DB struct {
	conn *pgx.Conn
	*repositery.Queries
}

func New(url string) (DB, error) {
	conn, err := pgx.Connect(context.Background(), url)
	if err != nil {
		return DB{}, err
	}

	return DB{
		conn:    conn,
		Queries: repositery.New(conn),
	}, nil
}

func (d *DB) Close() {
	d.conn.Close(context.Background())
}
