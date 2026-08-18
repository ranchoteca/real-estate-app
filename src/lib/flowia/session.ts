import { supabaseAdmin } from '@/lib/supabase';
import { AgentMode } from './constants';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

  // Never deduplicate short confirmation/command words in CREAR_PROPIEDAD mode.
  const isShortCommand = /^(s[ií]|listo|0)\.?!?$/i.test(messageText.trim());
  if (isShortCommand) {
    const { data: activeDraft } = await supabaseAdmin
      .from('agent_property_draft')
      .select('id')
      .eq('mode_active', true)
      .maybeSingle();
    if (activeDraft) return false;
  }

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

// Detects the language of the first message using a lightweight GPT call.
// Returns 'en' for English, 'es' for everything else.
// Falls back to 'es' on any error to keep the flow moving.
async function detectLanguage(text: string): Promise<'es' | 'en'> {
  if (!text || text.trim().length < 2) return 'es';

  // Fast path: common single-word English greetings and commands
  const quickEnglish = /^(hi|hello|hey|help|yes|no|ok|okay|menu|ready|good|thanks|thank you|please)\.?!?$/i.test(text.trim());
  if (quickEnglish) return 'en';

  // Fast path: common single-word Spanish greetings
  const quickSpanish = /^(hola|buenas|buen[oa]s|si|sí|no|ok|gracias|ayuda|menú|menu|listo)\.?!?$/i.test(text.trim());
  if (quickSpanish) return 'es';

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Detect the language of the following message. Reply with exactly one word: "en" for English or "es" for Spanish or any other language.',
        },
        { role: 'user', content: text },
      ],
      temperature: 0,
      max_tokens: 5,
    });
    const result = completion.choices[0].message.content?.trim().toLowerCase();
    return result === 'en' ? 'en' : 'es';
  } catch {
    return 'es';
  }
}

// Builds the welcome message in the detected language of the agent's first message.
export async function buildWelcomeMessage(primerNombre: string, firstMessage: string): Promise<string> {
  const lang = await detectLanguage(firstMessage);

  if (lang === 'en') {
    return `Hello ${primerNombre}! 👋 I'm *Flow*, your real estate assistant.

Here's what I can do for you today:

🔍 *1.* Search your property inventory
📄 *2.* Send a property PDF
🪪 *3.* Share your digital card
⛰️ *4.* Get the elevation of a location
🏠 *5.* Create a new property

Type the number of the option or tell me directly how I can help you. 😊`;
  }

  return `¡Hola ${primerNombre}! 👋 Soy *Flow*, tu asistente inmobiliario.

Esto es lo que puedo hacer por ti hoy:

🔍 *1.* Buscar propiedades de tu inventario
📄 *2.* Enviar el PDF de una propiedad
🪪 *3.* Compartir tu tarjeta digital
⛰️ *4.* Obtener la altura de un lugar
🏠 *5.* Crear una nueva propiedad

Escribe el número de la opción o dime directamente en qué te ayudo. 😊`;
}