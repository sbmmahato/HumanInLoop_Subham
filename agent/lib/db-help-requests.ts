import { createServerClient, type HelpRequest } from './supabase.js';

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
      timeout_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
    })
    .select()
    .single();

  if (error) throw error;
  return data;
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

export async function resolveHelpRequest(
  requestId: string,
  answer: string
): Promise<HelpRequest> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('help_requests')
    .update({
      status: 'resolved',
      supervisor_answer: answer,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

