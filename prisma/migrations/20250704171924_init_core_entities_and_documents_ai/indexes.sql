-- Enhanced Performance Indexes for CycleTime Core + Documents + AI Integration
-- These indexes support common query patterns for all Phase 1 and Phase 2 features

-- === CORE ENTITY INDEXES (Phase 1) ===

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
CREATE INDEX idx_user_sessions_active ON user_sessions(user_id, expires_at);

-- API key management
CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_active ON api_keys(user_id, is_active) WHERE is_active = true;
CREATE INDEX idx_api_keys_last_used ON api_keys(last_used_at) WHERE last_used_at IS NOT NULL;

-- === DOCUMENT MANAGEMENT INDEXES (Phase 2) ===

-- Document queries and filtering
CREATE INDEX idx_documents_project_id ON documents(project_id);
CREATE INDEX idx_documents_type ON documents(type);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_created_by ON documents(created_by);
CREATE INDEX idx_documents_created_at ON documents(created_at);
CREATE INDEX idx_documents_updated_at ON documents(updated_at);

-- Document version tracking
CREATE INDEX idx_document_versions_document_id ON document_versions(document_id);
CREATE INDEX idx_document_versions_version ON document_versions(document_id, version);
CREATE INDEX idx_document_versions_created_by ON document_versions(created_by);
CREATE INDEX idx_document_versions_created_at ON document_versions(created_at);

-- === AI INTEGRATION INDEXES (Phase 2) ===

-- AI request queries
CREATE INDEX idx_ai_requests_project_id ON ai_requests(project_id);
CREATE INDEX idx_ai_requests_user_id ON ai_requests(user_id);
CREATE INDEX idx_ai_requests_type ON ai_requests(type);
CREATE INDEX idx_ai_requests_status ON ai_requests(status);
CREATE INDEX idx_ai_requests_created_at ON ai_requests(created_at);
CREATE INDEX idx_ai_requests_model ON ai_requests(model);

-- AI response queries
CREATE INDEX idx_ai_responses_request_id ON ai_responses(request_id);
CREATE INDEX idx_ai_responses_model ON ai_responses(model);
CREATE INDEX idx_ai_responses_created_at ON ai_responses(created_at);

-- Usage tracking and analytics
CREATE INDEX idx_usage_tracking_request_id ON usage_tracking(request_id);
CREATE INDEX idx_usage_tracking_model ON usage_tracking(model);
CREATE INDEX idx_usage_tracking_created_at ON usage_tracking(created_at);

-- === FULL-TEXT SEARCH INDEXES (Phase 2) ===

-- Document content search
CREATE INDEX idx_documents_title_fts ON documents USING gin(to_tsvector('english', title));
CREATE INDEX idx_documents_description_fts ON documents USING gin(to_tsvector('english', description)) WHERE description IS NOT NULL;

-- Document version content search
CREATE INDEX idx_document_versions_content_fts ON document_versions USING gin(to_tsvector('english', content));

-- Project search
CREATE INDEX idx_projects_name_fts ON projects USING gin(to_tsvector('english', name));
CREATE INDEX idx_projects_description_fts ON projects USING gin(to_tsvector('english', description)) WHERE description IS NOT NULL;

-- === COMPOSITE INDEXES FOR COMPLEX QUERIES ===

-- Document management workflows
CREATE INDEX idx_documents_project_status_type ON documents(project_id, status, type);
CREATE INDEX idx_documents_project_updated ON documents(project_id, updated_at DESC);

-- AI request analytics
CREATE INDEX idx_ai_requests_user_status_created ON ai_requests(user_id, status, created_at DESC);
CREATE INDEX idx_ai_requests_project_type_created ON ai_requests(project_id, type, created_at DESC) WHERE project_id IS NOT NULL;

-- Usage analytics
CREATE INDEX idx_usage_tracking_model_date ON usage_tracking(model, created_at DESC);