export declare function createServerClient(): import("@supabase/supabase-js").SupabaseClient<any, "public", "public", any, any>;
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
//# sourceMappingURL=supabase.d.ts.map