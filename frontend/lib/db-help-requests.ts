import { createServerClient, type HelpRequest } from './supabase';

export async function createHelpRequest(
  roomName: string,
  participantIdentity: string,
  question: string
): Promise<HelpRequest> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('help_requests')
    .insert({
      room_name: roomName,
      participant_identity: participantIdentity,
      question,
      status: 'pending',
      timeout_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getPendingRequests(): Promise<HelpRequest[]> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('help_requests')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getAllRequests(): Promise<HelpRequest[]> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('help_requests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw error;
  return data || [];
}

export async function getHelpRequest(requestId: string): Promise<HelpRequest | null> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('help_requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

export async function resolveRequest(
  requestId: string,
  answer: string,
  status: 'resolved' | 'unresolved' = 'resolved'
): Promise<HelpRequest> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('help_requests')
    .update({
      status,
      supervisor_answer: answer,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function checkTimeouts(): Promise<number> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('help_requests')
    .update({
      status: 'unresolved',
      resolved_at: new Date().toISOString(),
    })
    .eq('status', 'pending')
    .lt('timeout_at', new Date().toISOString())
    .select();

  if (error) throw error;
  return data?.length || 0;
}
