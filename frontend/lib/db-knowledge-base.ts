import { createServerClient, type KnowledgeBaseEntry } from './supabase';

export async function searchKnowledgeBase(question: string): Promise<KnowledgeBaseEntry | null> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('knowledge_base')
    .select('*')
    .ilike('question', `%${question}%`)
    .order('usage_count', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

export async function addToKnowledgeBase(
  question: string,
  answer: string,
  sourceRequestId?: string
): Promise<KnowledgeBaseEntry> {
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

  if (error) throw error;
  return data;
}

export async function getAllKnowledgeEntries(): Promise<KnowledgeBaseEntry[]> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('knowledge_base')
    .select('*')
    .order('usage_count', { ascending: false })
    .limit(100);

  if (error) throw error;
  return data || [];
}

export async function incrementUsageCount(entryId: string): Promise<void> {
  const supabase = createServerClient();
  
  const { error } = await supabase.rpc('increment_knowledge_usage', {
    kb_id: entryId,
  });

  if (error) throw error;
}
