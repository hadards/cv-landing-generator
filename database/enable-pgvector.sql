-- Enable pgvector extension for vector similarity search
-- Run this in your Supabase SQL Editor

-- Enable the vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify installation
SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';

-- Test basic vector operations
SELECT '[1,2,3]'::vector <-> '[1,2,4]'::vector as distance_test;