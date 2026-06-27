// app/api/whatsapp-webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import OpenAI from 'openai';
import { getSystemPrompt } from '@/lib/ai/prompts';
import { sendWhatsAppMessage, formatForWhatsApp } from '@/lib/api/wasender';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const BASE_DOMAIN = 'https://www.flowestateai.com';
const PROPERTY_PATH = '/p/';

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

    await supabaseAdmin.from('chat_messages').insert({ agent_id: agent.id, role: 'user', content: messageText });

    // CARGAMOS EL PROMPT MODULAR
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
          description: "Úsalo ÚNICAMENTE cuando el agente pide un PDF o documento descargable de una propiedad específica.",
          parameters: {
            type: "object",
            properties: {
              slug: { type: "string", description: "El slug de la propiedad para generar el PDF" },
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
    let documentUrl = undefined;

    if (responseMessage.tool_calls) {
      const toolCall = responseMessage.tool_calls[0];
      const args = JSON.parse(toolCall.function.arguments);

      if (toolCall.function.name === "buscar_propiedades") {
        let query = supabaseAdmin
          .from('properties')
          .select('title, description, price, city, address, state, property_type, listing_type, currency_id, slug')
          .eq('agent_id', agent.id);

        if (args.termino_busqueda) {
          query = query.or(`title.ilike.%${args.termino_busqueda}%,description.ilike.%${args.termino_busqueda}%,city.ilike.%${args.termino_busqueda}%,address.ilike.%${args.termino_busqueda}%,state.ilike.%${args.termino_busqueda}%`);
        }

        if (args.tipo_transaccion) {
          const dbListingType = args.tipo_transaccion.toLowerCase() === 'alquiler' ? 'rent' : 'sale';
          query = query.eq('listing_type', dbListingType);
        }

        let { data: properties, error: dbError } = await query;
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

          // Filtrado estricto por moneda (sin conversión automática)
          if (args.precio_min !== undefined || args.precio_max !== undefined) {
            const min = args.precio_min ?? 0;
            const max = args.precio_max ?? Infinity;
            const monedaFiltro = args.moneda_referencia;

            properties = properties.filter(p => {
              if (monedaFiltro && p.currency_code !== monedaFiltro) return false;
              return p.price >= min && p.price <= max;
            });
          }
        }

        messages.push(responseMessage);
        messages.push({
          tool_call_id: toolCall.id,
          role: "tool",
          name: toolCall.function.name,
          content: JSON.stringify(properties || []),
        });

      } else if (toolCall.function.name === "enviar_pdf_propiedad") {
        // Lógica de generación/ubicación del PDF
        documentUrl = `${BASE_DOMAIN}/api/pdf-generator?slug=${args.slug}`; 
        
        messages.push(responseMessage);
        messages.push({
          tool_call_id: toolCall.id,
          role: "tool",
          name: toolCall.function.name,
          content: `Confirmado: El PDF se adjuntará usando la URL: ${documentUrl}. Escribe un mensaje breve indicando que el PDF está adjunto.`,
        });
      }

      const finalCompletion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: messages,
      });

      textoFinalParaEnviar = finalCompletion.choices[0].message.content || "Error procesando datos.";

    } else {
      textoFinalParaEnviar = responseMessage.content || `Hola ${primerNombre}, ¿en qué te ayudo?`;
    }

    const cleanFinalResponse = formatForWhatsApp(textoFinalParaEnviar);
    
    await supabaseAdmin.from('chat_messages').insert({ agent_id: agent.id, role: 'assistant', content: cleanFinalResponse });

    // Modificamos para aceptar el documentUrl
    await sendWhatsAppMessage(cleanNumber, cleanFinalResponse, documentUrl);
    
    return NextResponse.json({ success: true, status: 'replied_success' });

  } catch (error) {
    console.error('❌ Error crítico en el webhook:', error);
    return NextResponse.json({ success: true, error: 'Internal Server Error' });
  }
}