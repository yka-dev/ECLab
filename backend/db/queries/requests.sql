-- name: CreateRequest :one
INSERT INTO requests (type, user_id, project_id, expires_at) VALUES ($1, $2, $3, $4) RETURNING *;

-- name: DeleteRequestByID :exec
DELETE FROM requests WHERE id = $1;

-- name: GetRequestByID :one
SELECT * FROM requests WHERE id = $1;