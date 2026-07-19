import { supabaseAdmin } from '@/lib/supabase';
import { AgentMode } from './constants';

const HISTORY_WINDOW_HOURS = 3;
const HISTORY_LIMIT = 15;
const DUPLICATE_WINDOW_SECONDS = 30;

// ─── Historial de conversación ───────────────────────────────────────────────

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

export async function saveMessage(
  agentId: string,
  role: 'user' | 'assistant',
  content: string
) {
  await supabaseAdmin
    .from('chat_messages')
    .insert({ agent_id: agentId, role, content });
}

// ─── Detección de duplicados ──────────────────────────────────────────────────

export async function isDuplicateMessage(
  agentId: string,
  messageText: string
): Promise<boolean> {
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

// ─── Modo activo del agente ───────────────────────────────────────────────────
// Consultamos agent_property_draft para saber si el agente está en medio
// de una creación de propiedad. Esto permite que el webhook sepa a qué
// handler derivar el mensaje sin depender del historial de chat.

export async function getAgentMode(agentId: string): Promise<AgentMode> {
  const { data } = await supabaseAdmin
    .from('agent_property_draft')
    .select('mode_active')
    .eq('agent_id', agentId)
    .eq('mode_active', true)
    .maybeSingle();

  return data ? 'CREAR_PROPIEDAD' : null;
}

// ─── Mensaje de bienvenida ────────────────────────────────────────────────────

export function buildWelcomeMessage(primerNombre: string): string {
  return `¡Hola ${primerNombre}! 👋 Soy *Flow*, tu asistente inmobiliario.

Esto es lo que puedo hacer por ti hoy:

🔍 *Buscar propiedades* de tu inventario por ubicación, tipo o presupuesto.
📄 *Enviarte el PDF* con la ficha de cualquier propiedad específica.
🪪 *Compartir tu tarjeta digital* para que la envíes a tus clientes.
⛰️ *Obtener la altura de un lugar* que compartas usando Google Maps.
🏠 *Crear una propiedad* nueva en tu inventario.

¿En qué te ayudo?`;
}