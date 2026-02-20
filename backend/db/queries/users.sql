-- name: CreateUser :exec
INSERT INTO users (email, password_hash) VALUES($1, $2) RETURNING *;

-- name: GetUserByEmail :one
SELECT * FROM users WHERE email = $1;

-- name: GetUserById :one
SELECT * FROM users WHERE id = $1;