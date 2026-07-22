import { supabaseAdmin } from '@/lib/supabase';
import { AgentMode } from './constants';

const HISTORY_WINDOW_HOURS = 3;
const HISTORY_LIMIT = 15;
const DUPLICATE_WINDOW_SECONDS = 30;

// ─── Normal conversation history ─────────────────────────────────────────────
// Used in normal mode — last 15 messages within 3 hours is enough for
// conversational context (property search, PDF, altitude, etc.)

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

// ─── Property creation history ────────────────────────────────────────────────
// Used exclusively by handleListo — loads ALL messages since the draft was
// created, with no limit. This ensures audio transcriptions, free-form text,
// and Google Maps links sent during the session are always visible to the
// extractor regardless of how many messages the session generated.

export async function loadDraftHistory(agentId: string, draftCreatedAt: string) {
  const { data } = await supabaseAdmin
    .from('chat_messages')
    .select('role, content')
    .eq('agent_id', agentId)
    .gte('created_at', draftCreatedAt)
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

// ─── Deduplication ────────────────────────────────────────────────────────────
// Media webhooks arrive with empty messageBody — never deduplicate them here;
// they are deduplicated by messageId inside handleMediaEnDraft instead.

export async function isDuplicateMessage(
  agentId: string,
  messageText: string
): Promise<boolean> {
  if (!messageText || messageText.trim() === '') return false;

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

// ─── Agent mode ───────────────────────────────────────────────────────────────
// Check agent_property_draft to know if the agent is mid-creation.
// Returns the draft's created_at so loadDraftHistory can scope correctly.

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

// ─── Welcome message ──────────────────────────────────────────────────────────

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