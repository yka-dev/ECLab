-- name: CreateProject :one
WITH new_project AS (
    INSERT INTO projects (name)
    VALUES ($1)
    RETURNING *
),
new_member AS (
    INSERT INTO project_members (project_id, user_id, role)
    SELECT id, $2, 'owner'
    FROM new_project
    RETURNING *
)
SELECT
    new_project.*,
    new_member.*
FROM new_project
JOIN new_member ON new_member.project_id = new_project.id;

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

-- name: DeleteProjectByID :exec
DELETE FROM projects p
USING project_members pm
WHERE p.id = $1
  AND pm.project_id = p.id
  AND pm.user_id = $2
  AND pm.role = 'owner';


-- name: UpdateProjectByID :exec
UPDATE projects p
SET name = $1,
    updated_at = NOW()
FROM project_members pm
WHERE p.id = $2
  AND pm.project_id = p.id
  AND pm.user_id = $3
  AND pm.role = 'owner';