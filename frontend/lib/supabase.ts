import { createClient } from '@supabase/supabase-js';

// Client-side Supabase client (uses NEXT_PUBLIC_ env vars)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side client for API routes (uses service role key)
export function createServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  
  if (!url || !key) {
    console.error('Missing Supabase credentials:', { 
      hasUrl: !!url, 
      hasKey: !!key 
    });
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(url, key);
}

// Types
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
