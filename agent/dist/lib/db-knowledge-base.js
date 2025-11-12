import { createServerClient } from './supabase.js';
export async function searchKnowledgeBase(question) {
    const supabase = createServerClient();
    // Simple text search - in production, use full-text search
    const { data, error } = await supabase
        .from('knowledge_base')
        .select('*')
        .ilike('question', `%${question}%`)
        .order('usage_count', { ascending: false })
        .limit(1)
        .single();
    if (error) {
        if (error.code === 'PGRST116')
            return null;
        throw error;
    }
    return data;
}
export async function addToKnowledgeBase(question, answer, sourceRequestId) {
    const supabase = createServerClient();
    const { data, error } = await supabase
        .from('knowledge_base')
        .insert({
        question,
        answer,
        source_request_id: sourceRequestId,
    })
        .select()
        .single();
    if (error)
        throw error;
    return data;
}
export async function incrementKnowledgeUsage(entryId) {
    const supabase = createServerClient();
    const { error } = await supabase.rpc('increment_knowledge_usage', {
        kb_id: entryId,
    });
    if (error)
        throw error;
}
//# sourceMappingURL=db-knowledge-base.js.map