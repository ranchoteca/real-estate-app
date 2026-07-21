import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import OpenAI from 'openai';
import { getSystemPrompt } from '@/lib/ai/prompts';
import { sendWhatsAppMessage, sendQueued, formatForWhatsApp } from '@/lib/api/wasender';

import { loadHistory, saveMessage, isDuplicateMessage, getAgentMode, buildWelcomeMessage } from '@/lib/flowia/session';
import { FLOWIA_TOOLS } from '@/lib/flowia/tools';
import { BASE_DOMAIN, delay } from '@/lib/flowia/constants';
import { extractMediaInfo } from '@/lib/flowia/media/decrypt';

import { handleBuscarPropiedades } from '@/lib/flowia/handlers/buscar-propiedades';
import { handleEnviarPdf } from '@/lib/flowia/handlers/enviar-pdf';
import { handleCalcularAltura } from '@/lib/flowia/handlers/calcular-altura';
import {
  handleIniciarCreacion,
  handleMediaEnDraft,
  handleListo,
  handleConfirmacion,
  getDraft,
  clearDraft,
  esConfirmacionSi,
  esComandoListo,
  esIntentCancelar,
  esIntentCrearPropiedad,
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Only handle incoming message events — ignore status updates, etc.
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
    // Accept phone with or without leading '+' since Wasender may omit it
    const searchNumberWithPlus = cleanNumber.startsWith('+') ? cleanNumber : `+${cleanNumber}`;
    const { data: agent, error } = await supabaseAdmin
      .from('agents')
      .select('id, email, full_name, username, is_flowia_active')
      .or(`whatsapp_number.eq.${searchNumberWithPlus},whatsapp_number.eq.${cleanNumber}`)
      .single();

    if (error || !agent || !agent.is_flowia_active) {
      return NextResponse.json({ success: true, status: 'ignored_unauthorized_or_inactive' });
    }

    const primerNombre = agent.full_name ? agent.full_name.trim().split(' ')[0] : 'Agente';
    const linkTarjeta = agent.username
      ? `${BASE_DOMAIN}/agent/${agent.username}/card?lang=es`
      : BASE_DOMAIN;

    // ── Session: load history and send welcome if new session ─────────────────
    const history = await loadHistory(agent.id);
    const isNewSession = history.length === 0;

    if (isNewSession) {
      const mensajeBienvenida = buildWelcomeMessage(primerNombre);
      await sendQueued(agent.id, cleanNumber, mensajeBienvenida);
      await saveMessage(agent.id, 'assistant', mensajeBienvenida);
      // Save the incoming message and return — the welcome IS the response for
      // the first message of a session. This also prevents the double-welcome bug
      // where Wasender retries the webhook and OpenAI responds a second time.
      await saveMessage(agent.id, 'user', messageText);
      return NextResponse.json({ success: true, status: 'new_session_welcomed' });
    }

    // ── Deduplication ──────────────────────────────────────────────────────────
    // Media webhooks arrive with empty messageBody — never deduplicate them here;
    // they are deduplicated by messageId inside handleMediaEnDraft instead.
    if (await isDuplicateMessage(agent.id, messageText)) {
      console.log('⏳ Duplicate webhook detected. Ignoring.');
      return NextResponse.json({ success: true, status: 'ignored_webhook_retry' });
    }

    // Resolve numeric menu shortcut before saving so history stores the intent
    const resolvedText = MENU_SHORTCUTS[messageText.trim()] || messageText;
    await saveMessage(agent.id, 'user', resolvedText);

    // ── Detect active agent mode ───────────────────────────────────────────────
    const agentMode = await getAgentMode(agent.id);

    // ══════════════════════════════════════════════════════════════════════════
    // MODE: CREAR_PROPIEDAD
    // The agent is in the middle of creating a property. All messages are routed
    // here until the flow completes or the agent cancels.
    // ══════════════════════════════════════════════════════════════════════════
    if (agentMode === 'CREAR_PROPIEDAD') {

      // 1. Cancellation — agent wants to exit the flow at any point
      if (esIntentCancelar(resolvedText)) {
        await clearDraft(agent.id);
        const respuesta = `Entendido ${primerNombre}, cancelé la creación de la propiedad. ¿En qué más te puedo ayudar?`;
        await saveMessage(agent.id, 'assistant', respuesta);
        await sendQueued(agent.id, cleanNumber, respuesta);
        return NextResponse.json({ success: true, status: 'creation_cancelled' });
      }

      // 2. Incoming media (photo or audio)
      const mediaInfo = extractMediaInfo(rawMessage);
      if (mediaInfo) {
        const respuesta = await handleMediaEnDraft(agent.id, cleanNumber, messageId, rawMessage);
        if (respuesta) {
          await saveMessage(agent.id, 'assistant', respuesta);
          await sendQueued(agent.id, cleanNumber, respuesta);
        }
        return NextResponse.json({ success: true, status: 'media_processed_in_draft' });
      }

      // 3. LISTO command — validate fields and show confirmation summary
      if (esComandoListo(resolvedText)) {
        await handleListo(agent.id, cleanNumber, primerNombre, history);
        return NextResponse.json({ success: true, status: 'listo_processed' });
      }

      // 4. SÍ confirmation after the summary — trigger background property creation
      const draft = await getDraft(agent.id);
      const esperandoConfirmacion = draft && draft.title && draft.description;
      if (esperandoConfirmacion && esConfirmacionSi(resolvedText)) {
        await handleConfirmacion(agent.id, cleanNumber, primerNombre);
        return NextResponse.json({ success: true, status: 'property_creation_started' });
      }

      // 5. Free-form text — acknowledge and save to history so LISTO extractor sees it
      const ack = `📝 Recibido. Sigue enviando la información de la propiedad. Cuando termines, escribe *LISTO*.`;
      await saveMessage(agent.id, 'assistant', ack);
      await sendQueued(agent.id, cleanNumber, ack);
      return NextResponse.json({ success: true, status: 'draft_text_acknowledged' });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // MODE: NORMAL — shortcuts and OpenAI flow
    // ══════════════════════════════════════════════════════════════════════════

    // Property creation intent (also triggered by menu shortcut '5')
    if (esIntentCrearPropiedad(resolvedText)) {
      await handleIniciarCreacion(agent.id, cleanNumber, primerNombre);
      return NextResponse.json({ success: true, status: 'crear_propiedad_initiated' });
    }

    // Suppress phantom OpenAI response after a successful property creation:
    // if the agent sends a short thanks, respond without calling OpenAI
    const ultimoAsistente = history.findLast(m => m.role === 'assistant');
    const fueCreacionExitosa = ultimoAsistente?.content?.includes('¡Tu propiedad fue creada exitosamente!');
    const esAgradecimiento = /^(gracias|ok|okay|perfecto|genial|excelente|listo|dale|bien|👍|🙏)[\s!.]*$/i.test(resolvedText.trim());
    if (fueCreacionExitosa && esAgradecimiento) {
      const respuesta = `¡Con gusto ${primerNombre}! 😊 Si necesitas crear otra propiedad o tienes alguna consulta, aquí estoy.`;
      await saveMessage(agent.id, 'assistant', respuesta);
      await sendQueued(agent.id, cleanNumber, respuesta);
      return NextResponse.json({ success: true, status: 'post_creation_ack' });
    }

    // PDF shortcut: if the bot just offered a PDF and the agent confirms, send it without OpenAI
    const ultimoMensajeAsistente = history.length > 0 ? history[history.length - 1] : null;
    const ofrecioPdf = ultimoMensajeAsistente?.role === 'assistant'
      && ultimoMensajeAsistente.content?.includes('¿Te gustaría que te envíe un PDF');
    const yaEnvioPdf = ultimoMensajeAsistente?.role === 'assistant'
      && /pdf.*(enviado|generado)/i.test(ultimoMensajeAsistente.content || '');
    const esConfirmacionCorta = /^(s[ií]|s[ií] por favor|s[ií] me gustar[ií]a|dale|claro|ok|okay|va|porfa|porfavor)\.?!?$/i.test(resolvedText.trim());

    if (yaEnvioPdf && esConfirmacionCorta && !ofrecioPdf) {
      const respuesta = 'Perfecto, dime en qué más puedo ayudarte.';
      await saveMessage(agent.id, 'assistant', respuesta);
      await sendWhatsAppMessage(cleanNumber, respuesta);
      return NextResponse.json({ success: true, status: 'closed_pdf_followup' });
    }

    if (ofrecioPdf && esConfirmacionCorta) {
      const { data: ultimaMostrada } = await supabaseAdmin
        .from('agent_last_property_shown')
        .select('slug')
        .eq('agent_id', agent.id)
        .maybeSingle();

      if (ultimaMostrada?.slug) {
        await sendQueued(agent.id, cleanNumber, '⏳ *Generando el PDF de la propiedad...* Dame un momento por favor.');
        await delay(1200);
        const pdfUrl = `${BASE_DOMAIN}/api/pdf-generator?slug=${ultimaMostrada.slug}&agent_id=${agent.id}&t=${Date.now()}`;
        await sendQueued(agent.id, cleanNumber, '📄 Aquí tienes el documento detallado de la propiedad.', pdfUrl, `Ficha-${ultimaMostrada.slug}.pdf`);
        const respuestaFinal = 'PDF enviado correctamente. 📄 Si necesitas algo más, aquí estoy para ayudarte.';
        await saveMessage(agent.id, 'assistant', respuestaFinal);
        await sendQueued(agent.id, cleanNumber, respuestaFinal);
        return NextResponse.json({ success: true, status: 'pdf_sent_via_shortcut' });
      }
    }

    // ── Main OpenAI flow ───────────────────────────────────────────────────────
    const systemPrompt = getSystemPrompt(primerNombre, isNewSession, linkTarjeta);
    const messages: any[] = [
      { role: 'system', content: systemPrompt },
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

        // Track last shown property so PDF shortcut knows which slug to use
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
      textoFinalParaEnviar = responseMessage.content || `Hola ${primerNombre}, ¿en qué puedo ayudarte hoy?`;
    }

    // Append source footer when property listings are shown
    const mencionaPropiedad = textoFinalParaEnviar.includes('🔗');
    const yaTieneFuente = textoFinalParaEnviar.includes('Fuente:');
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