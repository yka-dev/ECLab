-- name: CreateProject :one
WITH new_project AS (
    INSERT INTO projects (name)
    VALUES ($1)
    RETURNING *
)
INSERT INTO project_members (project_id, user_id, role)
SELECT 
    np.id,
    $2,
    'owner'
FROM new_project np
RETURNING *;


-- name: GetProjectByID :one
SELECT 
    p.id AS project_id,
    p.*,
    pm.id AS member_id,
    pm.*
FROM projects p
JOIN project_members pm 
    ON pm.project_id = p.id
WHERE p.id = $1
  AND pm.user_id = $2;


-- name: GetProjectsByUserID :many
SELECT 
    p.*,
    pm.*
FROM project_members pm
JOIN projects p 
    ON p.id = pm.project_id
WHERE pm.user_id = $1
ORDER BY p.created_at DESC;