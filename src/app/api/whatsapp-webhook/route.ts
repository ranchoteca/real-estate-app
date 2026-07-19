import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import OpenAI from 'openai';
import { getSystemPrompt } from '@/lib/ai/prompts';
import { sendWhatsAppMessage, formatForWhatsApp } from '@/lib/api/wasender';

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
  esConfirmacionSi,
  esComandoListo,
  esIntentCrearPropiedad,
} from '@/lib/flowia/handlers/crear-propiedad';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // ── Filtros de evento ──────────────────────────────────────────────────────
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

    // ── Identificar agente ─────────────────────────────────────────────────────
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

    // ── Sesión: historial y bienvenida ─────────────────────────────────────────
    const history = await loadHistory(agent.id);
    const isNewSession = history.length === 0;

    if (isNewSession) {
      const mensajeBienvenida = buildWelcomeMessage(primerNombre);
      await sendWhatsAppMessage(cleanNumber, mensajeBienvenida);
      await saveMessage(agent.id, 'assistant', mensajeBienvenida);
    }

    // ── Deduplicación de webhooks ──────────────────────────────────────────────
    if (await isDuplicateMessage(agent.id, messageText)) {
      console.log('⏳ Webhook duplicado detectado. Ignorando.');
      return NextResponse.json({ success: true, status: 'ignored_webhook_retry' });
    }

    await saveMessage(agent.id, 'user', messageText);

    // ── Detectar modo activo del agente ───────────────────────────────────────
    const agentMode = await getAgentMode(agent.id);

    // ══════════════════════════════════════════════════════════════════════════
    // MODO: CREAR_PROPIEDAD
    // ══════════════════════════════════════════════════════════════════════════
    if (agentMode === 'CREAR_PROPIEDAD') {
      // 1. Media recibida (foto o audio)
      const mediaInfo = extractMediaInfo(rawMessage);
      if (mediaInfo) {
        const respuesta = await handleMediaEnDraft(agent.id, cleanNumber, messageId, rawMessage);
        if (respuesta) {
          await saveMessage(agent.id, 'assistant', respuesta);
          await sendWhatsAppMessage(cleanNumber, respuesta);
        }
        return NextResponse.json({ success: true, status: 'media_processed_in_draft' });
      }

      // 2. Comando LISTO — validar y mostrar resumen
      if (esComandoListo(messageText)) {
        await handleListo(agent.id, cleanNumber, primerNombre, history);
        return NextResponse.json({ success: true, status: 'listo_processed' });
      }

      // 3. Confirmación SÍ tras el resumen — crear la propiedad
      const draft = await getDraft(agent.id);
      const esperandoConfirmacion = draft && draft.title && draft.description; // tiene datos extraídos
      if (esperandoConfirmacion && esConfirmacionSi(messageText)) {
        await handleConfirmacion(agent.id, cleanNumber, primerNombre);
        return NextResponse.json({ success: true, status: 'property_creation_started' });
      }

      // 4. Mensaje de texto libre dentro del modo — acusar recibo y seguir
      const ack = `📝 Recibido. Sigue enviando la información de la propiedad. Cuando termines, escribe *LISTO*.`;
      await saveMessage(agent.id, 'assistant', ack);
      await sendWhatsAppMessage(cleanNumber, ack);
      return NextResponse.json({ success: true, status: 'draft_text_acknowledged' });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // MODO: NORMAL — shortcuts y flujo OpenAI
    // ══════════════════════════════════════════════════════════════════════════

    // Intent: crear propiedad
    if (esIntentCrearPropiedad(messageText)) {
      await handleIniciarCreacion(agent.id, cleanNumber, primerNombre);
      return NextResponse.json({ success: true, status: 'crear_propiedad_initiated' });
    }

    // Shortcut: PDF confirmado sin necesidad de llamar a OpenAI
    const ultimoMensajeAsistente = history.length > 0 ? history[history.length - 1] : null;
    const ofrecioPdf = ultimoMensajeAsistente?.role === 'assistant'
      && ultimoMensajeAsistente.content?.includes('¿Te gustaría que te envíe un PDF');
    const yaEnvioPdf = ultimoMensajeAsistente?.role === 'assistant'
      && /pdf.*(enviado|generado)/i.test(ultimoMensajeAsistente.content || '');
    const esConfirmacionCorta = /^(s[ií]|s[ií] por favor|s[ií] me gustar[ií]a|dale|claro|ok|okay|va|porfa|porfavor)\.?!?$/i.test(messageText.trim());

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
        await sendWhatsAppMessage(cleanNumber, '⏳ *Generando el PDF de la propiedad...* Dame un momento por favor.');
        await delay(1200);
        const pdfUrl = `${BASE_DOMAIN}/api/pdf-generator?slug=${ultimaMostrada.slug}&agent_id=${agent.id}&t=${Date.now()}`;
        await sendWhatsAppMessage(cleanNumber, '📄 Aquí tienes el documento detallado de la propiedad.', pdfUrl, `Ficha-${ultimaMostrada.slug}.pdf`);
        const respuestaFinal = 'PDF enviado correctamente. 📄 Si necesitas algo más, aquí estoy para ayudarte.';
        await saveMessage(agent.id, 'assistant', respuestaFinal);
        await sendWhatsAppMessage(cleanNumber, respuestaFinal);
        return NextResponse.json({ success: true, status: 'pdf_sent_via_shortcut' });
      }
    }

    // ── Flujo principal OpenAI ─────────────────────────────────────────────────
    const systemPrompt = getSystemPrompt(primerNombre, isNewSession, linkTarjeta);
    const messages: any[] = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: messageText },
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
        const { toolResult } = await handleCalcularAltura(cleanNumber, args, messageText);
        messages.push(responseMessage);
        messages.push({ tool_call_id: toolCall.id, role: 'tool', name: functionName, content: JSON.stringify(toolResult) });
        const finalCompletion = await openai.chat.completions.create({ model: 'gpt-4o', messages });
        textoFinalParaEnviar = finalCompletion.choices[0].message.content || '';
      }

    } else {
      textoFinalParaEnviar = responseMessage.content || `Hola ${primerNombre}, ¿en qué puedo ayudarte hoy?`;
    }

    // ── Fuente en respuestas con propiedades ───────────────────────────────────
    const mencionaPropiedad = textoFinalParaEnviar.includes('🔗');
    const yaTieneFuente = textoFinalParaEnviar.includes('Fuente:');
    const textoConFuente = mencionaPropiedad && !yaTieneFuente
      ? `${textoFinalParaEnviar}\n\n*Fuente: Plataforma inmobiliaria de FlowEstateAI*`
      : textoFinalParaEnviar;

    const cleanFinalResponse = formatForWhatsApp(textoConFuente);

    await saveMessage(agent.id, 'assistant', cleanFinalResponse);
    await sendWhatsAppMessage(cleanNumber, cleanFinalResponse);

    return NextResponse.json({ success: true, status: 'replied_success' });

  } catch (error) {
    console.error('❌ Error crítico en el webhook:', error);
    return NextResponse.json({ success: true, error: 'Internal Server Error' });
  }
}