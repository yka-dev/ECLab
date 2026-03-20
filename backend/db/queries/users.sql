-- name: CreateUser :one
INSERT INTO users (email, password_hash) VALUES($1, $2) RETURNING *;

-- name: GetUserByEmail :one
SELECT * FROM users WHERE email = $1;

-- name: GetUserById :one
SELECT * FROM users WHERE id = $1;

-- name: UpdateUserPassword :exec
UPDATE users SET password_hash = $2, password_updated_at = CURRENT_TIMESTAMP AT TIME ZONE 'UTC' WHERE id = $1;