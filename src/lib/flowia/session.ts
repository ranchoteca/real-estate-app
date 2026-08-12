import { supabaseAdmin } from '@/lib/supabase';
import { AgentMode } from './constants';

const HISTORY_WINDOW_HOURS = 3;
const HISTORY_LIMIT = 15;
// Reduced from 30s to 8s — Wasender retries arrive within 1-3s, so 30s was
// blocking legitimate re-sends after a failed response. 8s still catches
// true duplicates while allowing retries to go through.
const DUPLICATE_WINDOW_SECONDS = 8;

export async function loadHistory(agentId: string) {
  const windowStart = new Date(
    Date.now() - HISTORY_WINDOW_HOURS * 60 * 60 * 1000
  ).toISOString();

  const { data } = await supabaseAdmin
    .from('chat_messages')
    .select('role, content')
    .eq('agent_id', agentId)
    .gte('created_at', windowStart)
    .order('created_at', { ascending: false })
    .limit(HISTORY_LIMIT);

  return data ? [...data].reverse() : [];
}

// Loads ALL messages since the draft was created.
// We subtract 60s from draftCreatedAt as a buffer to handle any clock skew
// or timezone offset between Supabase and the webhook server.
export async function loadDraftHistory(agentId: string, draftCreatedAt: string) {
  // Subtract 60 seconds to ensure we don't miss messages saved just before
  // or at the same instant the draft was created
  const safeStart = new Date(new Date(draftCreatedAt).getTime() - 60 * 1000).toISOString();


  const { data } = await supabaseAdmin
    .from('chat_messages')
    .select('role, content')
    .eq('agent_id', agentId)
    .gte('created_at', safeStart)
    .order('created_at', { ascending: true });


  return data || [];
}

export async function saveMessage(
  agentId: string,
  role: 'user' | 'assistant',
  content: string
) {
  await supabaseAdmin
    .from('chat_messages')
    .insert({ agent_id: agentId, role, content });
}

export async function isDuplicateMessage(
  agentId: string,
  messageText: string
): Promise<boolean> {
  if (!messageText || messageText.trim() === '') return false;

  // Never deduplicate short confirmation words — agent may legitimately send
  // "Si" twice in quick succession (once after audio, once after summary)
  const confirmations = /^(s[ií]|si|sí|dale|ok|okay|va|listo)\.?!?$/i;
  if (confirmations.test(messageText.trim())) return false;

  const windowStart = new Date(
    Date.now() - DUPLICATE_WINDOW_SECONDS * 1000
  ).toISOString();

  const { data } = await supabaseAdmin
    .from('chat_messages')
    .select('id')
    .eq('agent_id', agentId)
    .eq('role', 'user')
    .eq('content', messageText)
    .gte('created_at', windowStart)
    .maybeSingle();

  return !!data;
}

export async function getAgentMode(agentId: string): Promise<{ mode: AgentMode; draftCreatedAt?: string }> {
  const { data } = await supabaseAdmin
    .from('agent_property_draft')
    .select('mode_active, created_at')
    .eq('agent_id', agentId)
    .eq('mode_active', true)
    .maybeSingle();

  return data
    ? { mode: 'CREAR_PROPIEDAD', draftCreatedAt: data.created_at }
    : { mode: null };
}

export function buildWelcomeMessage(primerNombre: string): string {
  return `¡Hola ${primerNombre}! 👋 Soy *Flow*, tu asistente inmobiliario.

Esto es lo que puedo hacer por ti hoy:

🔍 *1.* Buscar propiedades de tu inventario
📄 *2.* Enviar el PDF de una propiedad
🪪 *3.* Compartir tu tarjeta digital
⛰️ *4.* Obtener la altura de un lugar
🏠 *5.* Crear una nueva propiedad

Escribe el número de la opción o dime directamente en qué te ayudo. 😊`;
}