-- Help Requests Table
CREATE TABLE IF NOT EXISTS help_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_name TEXT NOT NULL,
  participant_identity TEXT NOT NULL,
  question TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'unresolved')),
  supervisor_answer TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  timeout_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 hour'),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Knowledge Base Table
CREATE TABLE IF NOT EXISTS knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  source_request_id UUID REFERENCES help_requests(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  usage_count INTEGER DEFAULT 0
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_help_requests_status ON help_requests(status);
CREATE INDEX IF NOT EXISTS idx_help_requests_created_at ON help_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_question ON knowledge_base USING gin(to_tsvector('english', question));

-- Function to automatically mark requests as unresolved on timeout
CREATE OR REPLACE FUNCTION check_timeout_requests()
RETURNS void AS $$
BEGIN
  UPDATE help_requests
  SET status = 'unresolved',
      resolved_at = NOW()
  WHERE status = 'pending'
    AND timeout_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to update knowledge base usage count
CREATE OR REPLACE FUNCTION increment_knowledge_usage(kb_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE knowledge_base
  SET usage_count = usage_count + 1,
      updated_at = NOW()
  WHERE id = kb_id;
END;
$$ LANGUAGE plpgsql;

