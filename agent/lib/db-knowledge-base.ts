import { createServerClient, type KnowledgeBaseEntry } from './supabase.js';

export async function searchKnowledgeBase(question: string): Promise<KnowledgeBaseEntry | null> {
  const supabase = createServerClient();
  
  //Try multiple search strategies for better matching
  const searchTerms = question.toLowerCase().split(' ').filter(word => word.length > 3);
  
  //First try: exact phrase match
  let { data, error } = await supabase
    .from('knowledge_base')
    .select('*')
    .ilike('question', `%${question}%`)
    .order('usage_count', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (data) return data;

  //Second try: search for any significant keywords
  if (searchTerms.length > 0) {
    const { data: allEntries } = await supabase
      .from('knowledge_base')
      .select('*')
      .order('usage_count', { ascending: false });
    
    if (allEntries && allEntries.length > 0) {
      //Find the best match based on keyword overlap
      let bestMatch: KnowledgeBaseEntry | null = null;
      let bestScore = 0;
      
      for (const entry of allEntries) {
        const entryTerms = entry.question.toLowerCase().split(' ');
        let score = 0;
        
        for (const term of searchTerms) {
          if (entryTerms.some(eTerm => eTerm.includes(term) || term.includes(eTerm))) {
            score++;
          }
        }
        
        // Require at least 2 matching terms or 1 term if only 1 search term
        if (score > bestScore && (score >= 2 || (searchTerms.length === 1 && score >= 1))) {
          bestScore = score;
          bestMatch = entry;
        }
      }
      
      if (bestMatch) {
        console.log(`Matched KB entry with score ${bestScore}/${searchTerms.length}`);
        return bestMatch;
      }
    }
  }

  return null;
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

export async function incrementKnowledgeUsage(entryId: string): Promise<void> {
  const supabase = createServerClient();
  
  const { error } = await supabase.rpc('increment_knowledge_usage', {
    kb_id: entryId,
  });

  if (error) throw error;
}

export async function getAllKnowledgeEntries(): Promise<KnowledgeBaseEntry[]> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('knowledge_base')
    .select('*')
    .order('usage_count', { ascending: false });

  if (error) throw error;
  return data || [];
}

