import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import OpenAI from 'openai';
import { getSystemPrompt } from '@/lib/ai/prompts';
import { sendQueued, formatForWhatsApp } from '@/lib/api/wasender';

import { loadHistory, saveMessage, isDuplicateMessage, getAgentMode, buildWelcomeMessage } from '@/lib/flowia/session';
import { FLOWIA_TOOLS } from '@/lib/flowia/tools';
import { BASE_DOMAIN, delay } from '@/lib/flowia/constants';
import { extractMediaInfo } from '@/lib/flowia/media/decrypt';

import { handleBuscarPropiedades } from '@/lib/flowia/handlers/buscar-propiedades';
import { handleEnviarPdf } from '@/lib/flowia/handlers/enviar-pdf';
import { handleCalcularAltura } from '@/lib/flowia/handlers/calcular-altura';
import {
  handleIniciarCreacion,
  handleLanguageSelection,
  handleMediaEnDraft,
  handleListo,
  handleConfirmacion,
  handleQueFalta,
  getDraft,
  clearDraft,
  esConfirmacionSi,
  esComandoListo,
  esSeleccionIdioma,
  esIntentCancelar,
  esIntentCrearPropiedad,
  esConsultaQueFalta,
  FlowLanguage,
  AgentWatermarkConfig,
} from '@/lib/flowia/handlers/crear-propiedad';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Numeric shortcuts shown in the welcome menu — maps digit to natural language intent
const MENU_SHORTCUTS: Record<string, string> = {
  '1': 'buscar propiedades',
  '2': 'enviar pdf',
  '3': 'tarjeta digital',
  '4': 'calcular altura',
  '5': 'quiero crear una propiedad',
};

// Returns the content of the most recent assistant message for this agent,
// queried directly from the DB with no window or limit constraints.
async function getLastBotMessage(agentId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('chat_messages')
    .select('content')
    .eq('agent_id', agentId)
    .eq('role', 'assistant')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.content || null;
}

// Detects the language of the current conversation from recent history.
// Looks at the last user message that has actual text content.
// Used for hardcoded messages in normal mode where GPT isn't involved.
function detectLangFromHistory(history: Array<{ role: string; content: string }>): 'es' | 'en' {
  // Find the most recent user message with text
  const recentUserMessages = history
    .filter(m => m.role === 'user' && m.content && m.content.trim().length > 1)
    .slice(-3);

  if (recentUserMessages.length === 0) return 'es';

  // Count English indicators across recent messages
  const combined = recentUserMessages.map(m => m.content).join(' ');
  const englishWords = combined.match(/\b(the|is|are|was|were|have|has|can|will|would|should|could|please|thank|hello|hi|hey|yes|no|ok|okay|good|great|help|need|want|send|show|find|give|get|my|your|i|you|we|they|it|and|or|but|for|with|from|to|of|in|on|at|by|about)\b/gi);
  const spanishWords = combined.match(/\b(el|la|los|las|un|una|es|son|esta|están|tiene|tienen|puede|puedo|favor|gracias|hola|buenos|buenas|si|sí|no|por|para|con|que|de|en|a|mi|tu|su|yo|tú|él|nosotros|ellos|y|o|pero|como|cuando|donde|quiero|necesito|busco|dame|ayuda)\b/gi);

  const enCount = englishWords?.length || 0;
  const esCount = spanishWords?.length || 0;

  return enCount > esCount ? 'en' : 'es';
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.event !== 'messages.received') {
      return NextResponse.json({ success: true, status: 'ignored_not_message_event' });
    }

    const messagesData = body?.data?.messages;
    if (!messagesData) {
      return NextResponse.json({ success: true, status: 'ignored_no_messages_data' });
    }

    const cleanNumber = messagesData.key?.cleanedSenderPn;
    const messageText = messagesData.messageBody || '';
    const messageId = messagesData.key?.id || '';
    const rawMessage = messagesData.message || {};

    if (!cleanNumber) {
      return NextResponse.json({ success: true, status: 'ignored_no_sender' });
    }

    // ── Identify agent ─────────────────────────────────────────────────────────
    const searchNumberWithPlus = cleanNumber.startsWith('+') ? cleanNumber : `+${cleanNumber}`;
    const { data: agent, error } = await supabaseAdmin
      .from('agents')
      .select('id, email, full_name, username, is_flowia_active, watermark_logo, watermark_position, watermark_size, watermark_image, watermark_opacity, watermark_scale, use_corner_logo, use_watermark')
      .or(`whatsapp_number.eq.${searchNumberWithPlus},whatsapp_number.eq.${cleanNumber}`)
      .single();

    if (error || !agent || !agent.is_flowia_active) {
      return NextResponse.json({ success: true, status: 'ignored_unauthorized_or_inactive' });
    }

    const primerNombre = agent.full_name ? agent.full_name.trim().split(' ')[0] : 'Agent';
    const linkTarjeta = agent.username
      ? `${BASE_DOMAIN}/agent/${agent.username}/card?lang=es`
      : BASE_DOMAIN;

    const watermarkConfig: AgentWatermarkConfig = {
      watermark_logo: agent.watermark_logo,
      watermark_position: agent.watermark_position,
      watermark_size: agent.watermark_size,
      watermark_image: agent.watermark_image,
      watermark_opacity: agent.watermark_opacity,
      watermark_scale: agent.watermark_scale,
      use_corner_logo: agent.use_corner_logo,
      use_watermark: agent.use_watermark,
    };

    // ── Session: load history and send welcome if new session ─────────────────
    const history = await loadHistory(agent.id);
    const isNewSession = history.length === 0;

    if (isNewSession) {
      // Clear any stale draft from a previous abandoned session so the agent
      // is not silently dropped back into CREAR_PROPIEDAD mode after a greeting.
      await clearDraft(agent.id);

      // Detect language from the first message and build welcome accordingly
      const mensajeBienvenida = await buildWelcomeMessage(primerNombre, messageText);
      await sendQueued(agent.id, cleanNumber, mensajeBienvenida);
      await saveMessage(agent.id, 'assistant', mensajeBienvenida);
      await saveMessage(agent.id, 'user', messageText);
      return NextResponse.json({ success: true, status: 'new_session_welcomed' });
    }

    // ── Deduplication ──────────────────────────────────────────────────────────
    if (await isDuplicateMessage(agent.id, messageText)) {
      console.log('⏳ Duplicate webhook detected. Ignoring.');
      return NextResponse.json({ success: true, status: 'ignored_webhook_retry' });
    }

    // ── Detect active agent mode ───────────────────────────────────────────────
    const { mode: agentMode, draftCreatedAt } = await getAgentMode(agent.id);

    // Resolve numeric menu shortcut — skip when in CREAR_PROPIEDAD mode so that
    // digits like 1 and 2 are not converted to menu intents during language
    // selection or other draft flow steps.
    const isMenuShortcut = agentMode !== 'CREAR_PROPIEDAD' && MENU_SHORTCUTS[messageText.trim()] !== undefined;
    const resolvedText = isMenuShortcut ? MENU_SHORTCUTS[messageText.trim()] : messageText;

    await saveMessage(agent.id, 'user', resolvedText);

    // ══════════════════════════════════════════════════════════════════════════
    // MODE: CREAR_PROPIEDAD
    // ══════════════════════════════════════════════════════════════════════════
    if (agentMode === 'CREAR_PROPIEDAD') {

      // Read draft to get flow_language — default to 'es' if not set yet
      const draft = await getDraft(agent.id);
      const lang: FlowLanguage = draft?.flow_language || 'es';
      const awaitingLanguage = !draft?.flow_language;

      // ── Language selection (1 or 2) — only valid right after flow initiation
      if (awaitingLanguage && esSeleccionIdioma(resolvedText)) {
        await handleLanguageSelection(agent.id, cleanNumber, primerNombre, resolvedText);
        return NextResponse.json({ success: true, status: 'language_selected' });
      }

      // ── If still awaiting language and agent sent something else, re-ask
      if (awaitingLanguage) {
        const langQuestion = '🌐 ¿En qué idioma vas a crear esta propiedad? / What language will you use for this property?\n\n🇨🇷 *1.* Español\n🇺🇸 *2.* English';
        await sendQueued(agent.id, cleanNumber, langQuestion);
        return NextResponse.json({ success: true, status: 'language_reasked' });
      }

      // 1. Confirmation (Sí / Yes) — check last bot message directly from DB
      if (esConfirmacionSi(resolvedText)) {
        const lastBotContent = await getLastBotMessage(agent.id);
        const confirmMarkerEs = '¿Todo correcto? Responde *SÍ*';
        const confirmMarkerEn = 'Is everything correct? Reply *YES*';
        if (lastBotContent?.includes(confirmMarkerEs) || lastBotContent?.includes(confirmMarkerEn)) {
          await handleConfirmacion(agent.id, cleanNumber, primerNombre, lastBotContent, lang);
          return NextResponse.json({ success: true, status: 'property_confirmed' });
        }
      }

      // 2. Cancellation
      if (esIntentCancelar(resolvedText)) {
        await clearDraft(agent.id);
        const cancelMsg = lang === 'en'
          ? `Understood ${primerNombre}, I cancelled the property creation. How else can I help you?`
          : `Entendido ${primerNombre}, cancelé la creación de la propiedad. ¿En qué más te puedo ayudar?`;
        await saveMessage(agent.id, 'assistant', cancelMsg);
        await sendQueued(agent.id, cleanNumber, cancelMsg);
        return NextResponse.json({ success: true, status: 'creation_cancelled' });
      }

      // 3. Incoming media (photo or audio)
      const mediaInfo = extractMediaInfo(rawMessage);
      if (mediaInfo) {
        const respuesta = await handleMediaEnDraft(agent.id, cleanNumber, messageId, rawMessage, lang, watermarkConfig);

        if (respuesta === '__PHOTO_MAX_REACHED__') {
          await new Promise(resolve => setTimeout(resolve, 3000));
          await handleListo(agent.id, cleanNumber, primerNombre, draftCreatedAt!, lang);
          return NextResponse.json({ success: true, status: 'photo_max_auto_listo' });
        }

        if (respuesta) {
          await saveMessage(agent.id, 'assistant', respuesta);
          await sendQueued(agent.id, cleanNumber, respuesta);
        }
        return NextResponse.json({ success: true, status: 'media_processed_in_draft' });
      }

      // 4. LISTO / READY command
      if (esComandoListo(resolvedText, lang)) {
        await handleListo(agent.id, cleanNumber, primerNombre, draftCreatedAt!, lang);
        return NextResponse.json({ success: true, status: 'listo_processed' });
      }

      // 5. "What's missing?"
      if (esConsultaQueFalta(resolvedText)) {
        const draftActual = await getDraft(agent.id);
        const respuesta = await handleQueFalta(agent.id, cleanNumber, draftActual, draftCreatedAt!, lang);
        await saveMessage(agent.id, 'assistant', respuesta);
        await sendQueued(agent.id, cleanNumber, respuesta);
        return NextResponse.json({ success: true, status: 'que_falta_responded' });
      }

      // 6. Empty message — ignore silently
      if (!messageText || messageText.trim() === '') {
        return NextResponse.json({ success: true, status: 'draft_empty_message_ignored' });
      }

      // 7. Free-form text — acknowledge in the flow language
      const ack = lang === 'en'
        ? '📝 Got it. Keep sending the property information. When you\'re done, type *READY*.\n_If you\'re not sure what\'s missing, type *"What\'s missing?"* or simply *"0"*_'
        : '📝 Recibido. Sigue enviando la información de la propiedad. Cuando termines, escribe *LISTO*.\n_Si no sabes qué falta, escríbeme *"¿Qué me falta?"* o simplemente *"0"*_';
      await saveMessage(agent.id, 'assistant', ack);
      await sendQueued(agent.id, cleanNumber, ack);
      return NextResponse.json({ success: true, status: 'draft_text_acknowledged' });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // MODE: NORMAL — shortcuts and OpenAI flow
    // ══════════════════════════════════════════════════════════════════════════

    if (esIntentCrearPropiedad(resolvedText)) {
      await handleIniciarCreacion(agent.id, cleanNumber);
      return NextResponse.json({ success: true, status: 'crear_propiedad_initiated' });
    }

    // Detect conversation language for hardcoded messages in normal mode
    const normalLang = detectLangFromHistory([...history, { role: 'user', content: resolvedText }]);

    // PDF shortcut
    const ultimoMensajeAsistente = history.length > 0 ? history[history.length - 1] : null;
    const ofrecioPdf = ultimoMensajeAsistente?.role === 'assistant'
      && (ultimoMensajeAsistente.content?.includes('¿Te gustaría que te envíe un PDF')
        || ultimoMensajeAsistente.content?.includes('Would you like me to send you a PDF'));
    const yaEnvioPdf = ultimoMensajeAsistente?.role === 'assistant'
      && /pdf.*(enviado|generado|sent|generated)/i.test(ultimoMensajeAsistente.content || '');
    const esConfirmacionCorta = /^(s[ií]|s[ií] por favor|dale|claro|ok|okay|va|porfa|yes|sure|please|go ahead)\.?!?$/i.test(resolvedText.trim());

    if (yaEnvioPdf && esConfirmacionCorta && !ofrecioPdf) {
      const respuesta = normalLang === 'en'
        ? 'Perfect, let me know if there\'s anything else I can help you with.'
        : 'Perfecto, dime en qué más puedo ayudarte.';
      await saveMessage(agent.id, 'assistant', respuesta);
      await sendQueued(agent.id, cleanNumber, respuesta);
      return NextResponse.json({ success: true, status: 'closed_pdf_followup' });
    }

    if (ofrecioPdf && esConfirmacionCorta) {
      const { data: ultimaMostrada } = await supabaseAdmin
        .from('agent_last_property_shown')
        .select('slug')
        .eq('agent_id', agent.id)
        .maybeSingle();

      if (ultimaMostrada?.slug) {
        const generatingMsg = normalLang === 'en'
          ? '⏳ *Generating the property PDF...* Give me a moment please.'
          : '⏳ *Generando el PDF de la propiedad...* Dame un momento por favor.';
        await sendQueued(agent.id, cleanNumber, generatingMsg);
        await delay(1200);
        const pdfUrl = `${BASE_DOMAIN}/api/pdf-generator?slug=${ultimaMostrada.slug}&agent_id=${agent.id}&t=${Date.now()}`;
        const pdfSentMsg = normalLang === 'en'
          ? '📄 Here is the detailed property document.'
          : '📄 Aquí tienes el documento detallado de la propiedad.';
        await sendQueued(agent.id, cleanNumber, pdfSentMsg, pdfUrl, `Ficha-${ultimaMostrada.slug}.pdf`);
        const respuestaFinal = normalLang === 'en'
          ? 'PDF sent successfully. 📄 If you need anything else, I\'m here to help.'
          : 'PDF enviado correctamente. 📄 Si necesitas algo más, aquí estoy para ayudarte.';
        await saveMessage(agent.id, 'assistant', respuestaFinal);
        await sendQueued(agent.id, cleanNumber, respuestaFinal);
        return NextResponse.json({ success: true, status: 'pdf_sent_via_shortcut' });
      }
    }

    // ── Main OpenAI flow ───────────────────────────────────────────────────────
    const systemPrompt = getSystemPrompt(primerNombre, isNewSession, linkTarjeta);
    const messages: any[] = [
      { role: 'system', content: systemPrompt + '\n\nIMPORTANT: Always respond in the same language the agent is writing in. If they write in English, respond in English. If they write in Spanish, respond in Spanish.' },
      ...history,
      { role: 'user', content: resolvedText },
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      tools: FLOWIA_TOOLS,
      tool_choice: 'auto',
    });

    const responseMessage = completion.choices[0].message;
    const toolCall = responseMessage.tool_calls?.[0];

    let textoFinalParaEnviar = '';

    if (toolCall) {
      const functionName = toolCall.function.name;
      const args = JSON.parse(toolCall.function.arguments);

      if (functionName === 'buscar_propiedades') {
        const { toolResult, slugParaPdf } = await handleBuscarPropiedades(agent.id, args);

        if (slugParaPdf) {
          await supabaseAdmin
            .from('agent_last_property_shown')
            .upsert({ agent_id: agent.id, slug: slugParaPdf }, { onConflict: 'agent_id' });
        }

        messages.push(responseMessage);
        messages.push({ tool_call_id: toolCall.id, role: 'tool', name: functionName, content: JSON.stringify(toolResult) });

        const finalCompletion = await openai.chat.completions.create({ model: 'gpt-4o', messages });
        textoFinalParaEnviar = finalCompletion.choices[0].message.content || '';

      } else if (functionName === 'enviar_pdf_propiedad') {
        const { toolResult, textoFinal } = await handleEnviarPdf(agent.id, cleanNumber, args);
        messages.push(responseMessage);
        messages.push({ tool_call_id: toolCall.id, role: 'tool', name: functionName, content: JSON.stringify(toolResult) });
        textoFinalParaEnviar = textoFinal;

      } else if (functionName === 'calcular_altura_ubicacion') {
        const { toolResult } = await handleCalcularAltura(agent.id, cleanNumber, args, resolvedText);
        messages.push(responseMessage);
        messages.push({ tool_call_id: toolCall.id, role: 'tool', name: functionName, content: JSON.stringify(toolResult) });
        const finalCompletion = await openai.chat.completions.create({ model: 'gpt-4o', messages });
        textoFinalParaEnviar = finalCompletion.choices[0].message.content || '';
      }

    } else {
      textoFinalParaEnviar = responseMessage.content || `Hello ${primerNombre}, how can I help you today?`;
    }

    const mencionaPropiedad = textoFinalParaEnviar.includes('🔗');
    const yaTieneFuente = textoFinalParaEnviar.includes('Fuente:') || textoFinalParaEnviar.includes('Source:');
    const textoConFuente = mencionaPropiedad && !yaTieneFuente
      ? `${textoFinalParaEnviar}\n\n*Fuente: Plataforma inmobiliaria de FlowEstateAI*`
      : textoFinalParaEnviar;

    const cleanFinalResponse = formatForWhatsApp(textoConFuente);

    await saveMessage(agent.id, 'assistant', cleanFinalResponse);
    await sendQueued(agent.id, cleanNumber, cleanFinalResponse);

    return NextResponse.json({ success: true, status: 'replied_success' });

  } catch (error) {
    console.error('❌ Critical error in webhook:', error);
    return NextResponse.json({ success: true, error: 'Internal Server Error' });
  }
}