-- Essential Performance Indexes for Core Entities
-- These indexes support common query patterns for CycleTime

-- User lookups and filtering
CREATE INDEX idx_users_github_id ON users(github_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = true;
CREATE INDEX idx_users_created_at ON users(created_at);

-- Project queries and filtering
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created_at ON projects(created_at);
CREATE INDEX idx_projects_updated_at ON projects(updated_at);

-- Project member lookups
CREATE INDEX idx_project_members_user_id ON project_members(user_id);
CREATE INDEX idx_project_members_project_role ON project_members(project_id, role);
CREATE INDEX idx_project_members_joined_at ON project_members(joined_at);

-- Repository queries
CREATE INDEX idx_repositories_owner ON repositories(owner);
CREATE INDEX idx_repositories_private ON repositories(is_private);
CREATE INDEX idx_repositories_sync_status ON repositories(sync_status);
CREATE INDEX idx_repositories_last_sync ON repositories(last_sync_at);

-- Session management
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX idx_user_sessions_active ON user_sessions(user_id, expires_at) WHERE expires_at > NOW();

-- API key management
CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_active ON api_keys(user_id, is_active) WHERE is_active = true;
CREATE INDEX idx_api_keys_last_used ON api_keys(last_used_at) WHERE last_used_at IS NOT NULL;