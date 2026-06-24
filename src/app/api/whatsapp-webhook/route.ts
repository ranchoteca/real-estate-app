import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const BASE_DOMAIN = 'https://www.flowestateai.com';
const PROPERTY_PATH = '/p/';

const CURRENCY_MAP: Record<string, { code: string; symbol: string }> = {
  'ec8528a3-d504-47fa-97db-2c07716d8b47': { code: 'CRC', symbol: '₡' },
  '839f44d5-bee2-4bc1-b5da-50364f14c681': { code: 'USD', symbol: '$' }
};

const TIPO_CAMBIO_USD_CRC = 520;

// FUNCION DE LIMPIEZA PARA WHATSAPP
// Transforma el **texto** de Markdown al *texto* compatible de WhatsApp
function formatForWhatsApp(text: string): string {
  return text.replace(/\*\*(.*?)\*\*/g, '*$1*');
}

async function sendWhatsAppMessage(to: string, text: string) {
  try {
    const response = await fetch("https://www.wasenderapi.com/api/send-message", {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WASENDER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ to, text })
    });
    return await response.json();
  } catch (error) {
    console.error('Error enviando mensaje de Wasender:', error);
  }
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

    if (!cleanNumber) {
       return NextResponse.json({ success: true, status: 'ignored_no_sender' }); 
    }

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

    // --- NUEVO: RECUPERAR HISTORIAL DE HACE 3 HORAS ---
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

    // --- NUEVO: GUARDAR MENSAJE DEL USUARIO EN BD ---
    await supabaseAdmin.from('chat_messages').insert({
      agent_id: agent.id,
      role: 'user',
      content: messageText
    });

    // INSTRUCCIONES CONDICIONALES PARA PRESENTACIÓN
    const instruccionPresentacion = isNewSession 
      ? `Dado que esta es tu primera interacción del día con ${primerNombre}, INICIA tu respuesta presentándote de forma cálida (ej. "¡Hola ${primerNombre}! Soy FlowIA, tu asistente virtual de Flow Estate AI...").`
      : `Ya están conversando. NO te presentes ni saludes nuevamente, ve directo al punto.`;

    const messages: any[] = [
      {
        role: "system",
        content: `Eres FlowIA, el copiloto inmobiliario virtual exclusivo de FlowEstateAI. Estás asistiendo directamente a tu agente, ${primerNombre}.
        
        Tus directrices de comportamiento:
        1. Personalización: Dirígete al agente exclusivamente por su primer nombre (${primerNombre}). Nunca uses sus apellidos.
        2. ${instruccionPresentacion}
        3. Tarjeta Digital: Si el agente pide su tarjeta de presentación, entrégale este link: ${linkTarjeta}
        4. Formato Atractivo: Usa emojis (🏡, 📍, 💰).
        5. Formato de Texto: NUNCA uses doble asterisco para negrita. Si debes resaltar texto, usa obligatoriamente un solo asterisco (*texto*).
        6. Links de Propiedades: Siempre incluye el enlace web ('property_url') al final de la descripción de cualquier propiedad.
        7. Divisas: Respeta la divisa original (₡ o $).
        8. LÍMITE DE PLATAFORMA (MUY IMPORTANTE): Tu único propósito es gestionar y consultar el inventario de propiedades del agente dentro de la plataforma. NO eres un analista de mercado. NUNCA ofrezcas información sobre el "mercado inmobiliario", tendencias, ni propiedades externas. Si te piden algo fuera del inventario, aclara que solo gestionas las propiedades cargadas en su cuenta.
        9. CANDADO ESTRICTO DE DOMINIO: Si te preguntan sobre recetas de cocina, política, chistes, conocimientos generales o cualquier tema fuera de la plataforma, DEBES negarte amablemente y recordar tu propósito.
        10. REGLA ANTI-LORO: Si envías los detalles de una propiedad y el agente responde con ambigüedad (ej. "Sí", "Ok"), NUNCA repitas la misma ficha técnica que acabas de enviar. Pregúntale exactamente qué detalle adicional desea saber o si quiere agendar una visita.`
      },
      ...history,
      { role: "user", content: messageText }
    ];

    const tools = [
      {
        type: "function" as const,
        function: {
          name: "buscar_propiedades",
          description: "Busca propiedades del agente aplicando filtros inteligentes de texto, tipo de negocio y presupuestos.",
          parameters: {
            type: "object",
            properties: {
              termino_busqueda: { type: "string", description: "Palabras clave (ej. 'Bagaces', 'finca')." },
              precio_min: { type: "number", description: "Monto mínimo del presupuesto solicitado." },
              precio_max: { type: "number", description: "Monto máximo del presupuesto solicitado." },
              moneda_referencia: { type: "string", enum: ["CRC", "USD"], description: "Divisa de referencia (CRC o USD)." },
              tipo_transaccion: { type: "string", enum: ["venta", "alquiler"] },
            },
          },
        },
      },
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
      const args = JSON.parse(toolCall.function.arguments);

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
      if (dbError) console.error("❌ Error en base de datos:", dbError);

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
          const monedaFiltro = args.moneda_referencia || 'CRC';

          properties = properties.filter(p => {
            let precioConvertido = p.price;
            if (p.currency_code === 'USD' && monedaFiltro === 'CRC') {
              precioConvertido = p.price * TIPO_CAMBIO_USD_CRC;
            } else if (p.currency_code === 'CRC' && monedaFiltro === 'USD') {
              precioConvertido = p.price / TIPO_CAMBIO_USD_CRC;
            }
            return precioConvertido >= min && precioConvertido <= max;
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

      const finalCompletion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: messages,
      });

      textoFinalParaEnviar = finalCompletion.choices[0].message.content || "Lo siento, tuve un error al procesar los datos.";

    } else {
      textoFinalParaEnviar = responseMessage.content || `Hola ${primerNombre}, ¿en qué puedo ayudarte hoy con tus propiedades?`;
    }

    // --- APLICAR LIMPIEZA REGEX Y GUARDAR RESPUESTA DE LA IA ---
    const cleanFinalResponse = formatForWhatsApp(textoFinalParaEnviar);
    
    await supabaseAdmin.from('chat_messages').insert({
      agent_id: agent.id,
      role: 'assistant',
      content: cleanFinalResponse
    });

    await sendWhatsAppMessage(cleanNumber, cleanFinalResponse);
    return NextResponse.json({ success: true, status: 'replied_success' });

  } catch (error) {
    console.error('❌ Error crítico en el webhook:', error);
    return NextResponse.json({ success: true, error: 'Internal Server Error' });
  }
}