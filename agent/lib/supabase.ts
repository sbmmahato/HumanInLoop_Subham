import { createClient } from '@supabase/supabase-js';

export function createServerClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error('SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL is required');
  }
  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY is required');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

export interface HelpRequest {
  id: string;
  room_name: string;
  participant_identity: string;
  question: string;
  status: 'pending' | 'resolved' | 'unresolved';
  supervisor_answer?: string;
  created_at: string;
  resolved_at?: string;
  timeout_at: string;
  metadata?: Record<string, any>;
}

export interface KnowledgeBaseEntry {
  id: string;
  question: string;
  answer: string;
  source_request_id?: string;
  created_at: string;
  updated_at: string;
  usage_count: number;
}

