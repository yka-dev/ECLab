CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE requests_type AS ENUM (
  'reset_password',
  'verify_email',
  'join_team'
);


CREATE TABLE IF NOT EXISTS requests(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type requests_type NOT NULL,

  user_id BIGINT NOT NULL,
  project_id BIGINT,
  
  created_at TIMESTAMPTZ DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
