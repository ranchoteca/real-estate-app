import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import OpenAI from 'openai';
import { getSystemPrompt } from '@/lib/ai/prompts';
import { sendWhatsAppMessage, formatForWhatsApp } from '@/lib/api/wasender';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const BASE_DOMAIN = 'https://www.flowestateai.com';
const PROPERTY_PATH = '/p/';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const CURRENCY_MAP: Record<string, { code: string; symbol: string }> = {
  'ec8528a3-d504-47fa-97db-2c07716d8b47': { code: 'CRC', symbol: '₡' },
  '839f44d5-bee2-4bc1-b5da-50364f14c681': { code: 'USD', symbol: '$' }
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.event !== 'messages.received') return NextResponse.json({ success: true, status: 'ignored_not_message_event' });
    
    const messagesData = body?.data?.messages;
    if (!messagesData) return NextResponse.json({ success: true, status: 'ignored_no_messages_data' });

    const cleanNumber = messagesData.key?.cleanedSenderPn;
    const messageText = messagesData.messageBody || '';
    if (!cleanNumber) return NextResponse.json({ success: true, status: 'ignored_no_sender' });

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
    const linkTarjeta = agent.username ? `${BASE_DOMAIN}/agent/${agent.username}/card?lang=es` : BASE_DOMAIN;

    const tresHorasAtras = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    const { data: historyData } = await supabaseAdmin
      .from('chat_messages')
      .select('role, content')
      .eq('agent_id', agent.id)
      .gte('created_at', tresHorasAtras)
      .order('created_at', { ascending: true })
      .limit(15);

    const history = historyData || [];
    const isNewSession = history.length === 0;

    if (isNewSession) {
      const mensajeBienvenida = `¡Hola ${primerNombre}! 👋 Soy *FlowIA*, tu asistente inmobiliario.

    Esto es lo que puedo hacer por ti hoy:

    🔍 *Buscar propiedades* de tu inventario por ubicación, tipo o presupuesto.
    📄 *Enviarte el PDF* con la ficha de cualquier propiedad específica.
    🪪 *Compartir tu tarjeta digital* para que la envíes a tus clientes.

    ¿En qué te ayudo?`;

      await sendWhatsAppMessage(cleanNumber, mensajeBienvenida);
      await supabaseAdmin.from('chat_messages').insert({ 
        agent_id: agent.id, 
        role: 'assistant', 
        content: mensajeBienvenida 
      });
    }

    const hace30Segundos = new Date(Date.now() - 30 * 1000).toISOString();
    const { data: mensajeDuplicado } = await supabaseAdmin
      .from('chat_messages')
      .select('id')
      .eq('agent_id', agent.id)
      .eq('role', 'user')
      .eq('content', messageText)
      .gte('created_at', hace30Segundos)
      .maybeSingle();

    if (mensajeDuplicado) {
      console.log('⏳ Reintento de webhook de Wasender detectado. Ignorando para evitar colapso (429).');
      return NextResponse.json({ success: true, status: 'ignored_webhook_retry' });
    }

    await supabaseAdmin.from('chat_messages').insert({ agent_id: agent.id, role: 'user', content: messageText });

    const ultimoMensajeAsistente = history.length > 0 ? history[history.length - 1] : null;
    const ofrecioPdf = ultimoMensajeAsistente?.role === 'assistant' 
      && ultimoMensajeAsistente.content?.includes('¿Te gustaría que te envíe un PDF');

    const yaEnvioPdfRecientemente = ultimoMensajeAsistente?.role === 'assistant'
      && /pdf.*(enviado|generado)/i.test(ultimoMensajeAsistente.content || '');

    const esConfirmacionCorta = /^(s[ií]|s[ií] por favor|s[ií] me gustar[ií]a|dale|claro|ok|okay|va|porfa|porfavor)\.?!?$/i.test(messageText.trim());

    if (yaEnvioPdfRecientemente && esConfirmacionCorta && !ofrecioPdf) {
      const respuestaCierre = "Perfecto, dime en qué más puedo ayudarte.";
      await supabaseAdmin.from('chat_messages').insert({ agent_id: agent.id, role: 'assistant', content: respuestaCierre });
      await sendWhatsAppMessage(cleanNumber, respuestaCierre);
      return NextResponse.json({ success: true, status: 'closed_pdf_followup' });
    }
    
    if (ofrecioPdf && esConfirmacionCorta) {
      const { data: ultimaMostrada } = await supabaseAdmin
        .from('agent_last_property_shown')
        .select('slug')
        .eq('agent_id', agent.id)
        .maybeSingle();

      if (ultimaMostrada?.slug) {
        const slug = ultimaMostrada.slug;

        await sendWhatsAppMessage(cleanNumber, "⏳ *Generando el PDF de la propiedad...* Dame un momento por favor.");
        await delay(1200);

        const pdfUrl = `${BASE_DOMAIN}/api/pdf-generator?slug=${slug}&agent_id=${agent.id}`;
        await sendWhatsAppMessage(
          cleanNumber,
          `📄 Aquí tienes el documento detallado de la propiedad.`,
          pdfUrl,
          `Ficha-${slug}.pdf`
        );

        const respuestaFinal = "PDF enviado correctamente. 📄 Si necesitas algo más, aquí estoy para ayudarte.";
        await supabaseAdmin.from('chat_messages').insert({ agent_id: agent.id, role: 'assistant', content: respuestaFinal });
        await sendWhatsAppMessage(cleanNumber, respuestaFinal);

        return NextResponse.json({ success: true, status: 'pdf_sent_via_shortcut' });
      }
    }

    const systemPrompt = getSystemPrompt(primerNombre, isNewSession, linkTarjeta);

    const messages: any[] = [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: messageText }
    ];

    const tools = [
      {
        type: "function" as const,
        function: {
          name: "buscar_propiedades",
          description: "Busca propiedades aplicando filtros de texto, tipo de negocio y presupuestos exactos.",
          parameters: {
            type: "object",
            properties: {
              termino_busqueda: { type: "string" },
              precio_min: { type: "number" },
              precio_max: { type: "number" },
              moneda_referencia: { type: "string", enum: ["CRC", "USD"] },
              tipo_transaccion: { type: "string", enum: ["venta", "alquiler"] },
            },
          },
        },
      },
      {
        type: "function" as const,
        function: {
          name: "enviar_pdf_propiedad",
          description: "Úsalo ÚNICAMENTE cuando el agente pide un PDF. DEBES extraer el 'slug' exacto de la propiedad del contexto y enviarlo en los parámetros.",
          parameters: {
            type: "object",
            properties: {
              slug: { type: "string", description: "El slug exacto de la propiedad solicitada." },
            },
            required: ["slug"]
          },
        },
      }
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages,
      tools: tools,
      tool_choice: "auto",
    });

    const responseMessage = completion.choices[0].message;
    let textoFinalParaEnviar = "";

    if (responseMessage.tool_calls) {
      const toolCall = responseMessage.tool_calls[0];
      const functionName = toolCall.function.name;
      const args = JSON.parse(toolCall.function.arguments);

      if (functionName === "buscar_propiedades") {
        let query = supabaseAdmin
          .from('properties')
          .select('title, description, price, city, address, state, property_type, listing_type, currency_id, slug', { count: 'exact' })
          .eq('agent_id', agent.id);

        if (args.termino_busqueda) {
          query = query.or(`title.ilike.%${args.termino_busqueda}%,description.ilike.%${args.termino_busqueda}%,city.ilike.%${args.termino_busqueda}%,address.ilike.%${args.termino_busqueda}%,state.ilike.%${args.termino_busqueda}%`);
        }

        if (args.tipo_transaccion) {
          const dbListingType = args.tipo_transaccion.toLowerCase() === 'alquiler' ? 'rent' : 'sale';
          query = query.eq('listing_type', dbListingType);
        }

        let { data: properties, count, error: dbError } = await query.limit(5);
        if (dbError) console.error("❌ Error DB:", dbError);

        if (properties && properties.length > 0) {
          properties = properties.map(p => {
            const coin = CURRENCY_MAP[p.currency_id] || { code: 'CRC', symbol: '₡' };
            return {
              ...p,
              currency_code: coin.code,
              currency_symbol: coin.symbol,
              property_url: `${BASE_DOMAIN}${PROPERTY_PATH}${p.slug}`
            };
          });

          if (args.precio_min !== undefined || args.precio_max !== undefined) {
            const min = args.precio_min ?? 0;
            const max = args.precio_max ?? Infinity;
            const monedaFiltro = args.moneda_referencia;

            properties = properties.filter(p => {
              if (monedaFiltro && p.currency_code !== monedaFiltro) return false;
              return p.price >= min && p.price <= max;
            });
          }

          if (properties.length === 1) {
            await supabaseAdmin
              .from('agent_last_property_shown')
              .upsert({ agent_id: agent.id, slug: properties[0].slug, updated_at: new Date().toISOString() });
          }
        }

        messages.push(responseMessage);
        messages.push({
          tool_call_id: toolCall.id,
          role: "tool",
          name: toolCall.function.name,
          content: JSON.stringify({
            total_encontradas: count || 0,
            propiedades_mostradas: properties?.length || 0,
            resultados: properties || [],
            instruccion_pdf: properties?.length === 1 
              ? "Hay UNA sola propiedad. Al final de tu respuesta, ofrece el PDF."
              : "Hay MÚLTIPLES propiedades. NO ofrezcas PDF bajo ninguna circunstancia."
            }),
        });

        const finalCompletion = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: messages,
        });

        textoFinalParaEnviar = finalCompletion.choices[0].message.content || "Lo siento, tuve un error al procesar la búsqueda.";

      } else if (functionName === "enviar_pdf_propiedad") {
        let slug = args.slug;

        const { data: propiedadValidada } = await supabaseAdmin
          .from('properties')
          .select('slug')
          .eq('agent_id', agent.id)
          .eq('slug', slug)
          .maybeSingle();

        if (!propiedadValidada) {
          const { data: ultimaMostrada } = await supabaseAdmin
            .from('agent_last_property_shown')
            .select('slug')
            .eq('agent_id', agent.id)
            .maybeSingle();

          slug = ultimaMostrada?.slug;
        }

        if (!slug) {
          textoFinalParaEnviar = "No logré identificar con certeza qué propiedad quieres en PDF. ¿Puedes confirmarme el nombre o la ubicación?";
        } else {

          await sendWhatsAppMessage(cleanNumber, "⏳ *Generando el PDF de la propiedad...* Dame un momento por favor.");
          await delay(1200);

          try {
            const pdfUrl = `${BASE_DOMAIN}/api/pdf-generator?slug=${slug}&agent_id=${agent.id}`;

            await sendWhatsAppMessage(
              cleanNumber, 
              `📄 Aquí tienes el documento detallado de la propiedad.`, 
              pdfUrl, 
              `Ficha-${slug}.pdf`
            );
            await delay(1200);

            messages.push(responseMessage);
            messages.push({
              tool_call_id: toolCall.id,
              role: "tool",
              name: toolCall.function.name,
              content: JSON.stringify({ 
                success: true, 
                message: "PDF generado y enviado exitosamente.",
                instruccion_sistema: "El PDF YA fue enviado. NO vuelvas a ofrecerlo ni a generarlo de nuevo a menos que el agente pida explícitamente OTRA propiedad o diga la palabra 'PDF' de forma clara y nueva. Si el agente solo dice 'sí', 'gracias' o algo ambiguo después de esto, asume que está cerrando la conversación o agradeciendo — NO ejecutes la función de PDF otra vez."
              }),
            });

            const finalCompletion = await openai.chat.completions.create({
              model: "gpt-4o",
              messages: messages,
            });

            textoFinalParaEnviar = finalCompletion.choices[0].message.content || "PDF enviado correctamente.";

          } catch (error) {
            console.error("Error al despachar el PDF:", error);
            textoFinalParaEnviar = "❌ Lo siento, tuve un problema al generar el documento. Inténtalo de nuevo.";
          }
        }
      }

    } else {
      textoFinalParaEnviar = responseMessage.content || `Hola ${primerNombre}, ¿en qué puedo ayudarte hoy?`;
    }

    const cleanFinalResponse = formatForWhatsApp(textoFinalParaEnviar);
    
    await supabaseAdmin.from('chat_messages').insert({ agent_id: agent.id, role: 'assistant', content: cleanFinalResponse });
    await sendWhatsAppMessage(cleanNumber, cleanFinalResponse);
    
    return NextResponse.json({ success: true, status: 'replied_success' });

  } catch (error) {
    console.error('❌ Error crítico en el webhook:', error);
    return NextResponse.json({ success: true, error: 'Internal Server Error' });
  }
}