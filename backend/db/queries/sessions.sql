-- name: GetSessionByID :one
SELECT * FROM sessions WHERE id = $1;

-- name: GetSessionsByUserID :many
SELECT * FROM sessions WHERE user_id = $1;

-- name: CreateSession :one
INSERT INTO sessions (user_id, expires_at) VALUES ($1, $2) RETURNING *;

-- name: DeleteSessionByID :exec
DELETE FROM sessions WHERE id = $1;