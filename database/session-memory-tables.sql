-- Session Memory + Learning Tables for Intelligent CV Processing
-- Run after enabling pgvector extension

-- 1. CV Processing Sessions Table (temporary session memory)
CREATE TABLE cv_processing_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cv_text_preview TEXT, -- First 500 chars for reference
    session_data JSONB DEFAULT '{}', -- Stores extracted data between steps
    step_count INTEGER DEFAULT 0,
    current_step VARCHAR(50),
    processing_metadata JSONB DEFAULT '{}', -- Store CV type, profession, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP + INTERVAL '2 hours'
);

-- 2. CV Learning Samples Table (permanent learning data)
CREATE TABLE cv_learning_samples (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cv_text_preview TEXT NOT NULL, -- First 500 chars for similarity matching
    profession VARCHAR(100),
    cv_type VARCHAR(50), -- 'technical', 'academic', 'creative', 'entry_level', etc.
    industry VARCHAR(100),
    extraction_strategy JSONB NOT NULL, -- What steps worked, what prompts used
    structured_result JSONB NOT NULL, -- Final extracted CV data
    embedding vector(1536), -- Vector representation for similarity search
    success_score FLOAT DEFAULT 1.0, -- Quality score (0-1)
    processing_time_ms INTEGER, -- How long processing took
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Indexes for performance
-- Session cleanup index
CREATE INDEX idx_cv_sessions_expires ON cv_processing_sessions(expires_at);
CREATE INDEX idx_cv_sessions_user ON cv_processing_sessions(user_id);

-- Learning samples similarity search index
CREATE INDEX ON cv_learning_samples USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_cv_learning_profession ON cv_learning_samples(profession);
CREATE INDEX idx_cv_learning_type ON cv_learning_samples(cv_type);

-- 4. Automatic session cleanup function
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM cv_processing_sessions 
    WHERE expires_at < CURRENT_TIMESTAMP;
    
    -- Log cleanup
    RAISE NOTICE 'Cleaned up expired CV processing sessions';
END;
$$ LANGUAGE plpgsql;

-- 5. Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_session_timestamp
    BEFORE UPDATE ON cv_processing_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_session_timestamp();

-- 6. Schedule cleanup job (run this manually periodically or set up cron)
-- This is for manual cleanup - you can run this occasionally:
-- SELECT cleanup_expired_sessions();

-- 7. Test the tables
INSERT INTO cv_processing_sessions (user_id, cv_text_preview) 
VALUES ('0d7a5108-516a-4b43-8bbd-bc1b66a4f93e', 'Test CV preview text...');

-- Verify tables created
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('cv_processing_sessions', 'cv_learning_samples')
ORDER BY table_name, ordinal_position;