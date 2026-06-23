import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// CONFIGURACIÓN DE RUTAS WEB (Ajusta estas según las URLs reales de tu PWA)
const BASE_DOMAIN = 'https://www.flowestateai.com';
const PROPERTY_PATH = '/p/';

// MAPEO DE DIVISAS
const CURRENCY_MAP: Record<string, { code: string; symbol: string }> = {
  'ec8528a3-d504-47fa-97db-2c07716d8b47': { code: 'CRC', symbol: '₡' },
  '839f44d5-bee2-4bc1-b5da-50364f14c681': { code: 'USD', symbol: '$' }
};

const TIPO_CAMBIO_USD_CRC = 520; 

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

    // Agregamos 'username' al select para armar el link de la tarjeta
    const { data: agent, error } = await supabaseAdmin
      .from('agents')
      .select('id, email, full_name, username, is_flowia_active')
      .or(`whatsapp_number.eq.${searchNumberWithPlus},whatsapp_number.eq.${cleanNumber}`)
      .single();

    if (error || !agent || !agent.is_flowia_active) {
      return NextResponse.json({ success: true, status: 'ignored_unauthorized_or_inactive' }); 
    }

    // EXTRAER SOLO EL PRIMER NOMBRE
    const primerNombre = agent.full_name ? agent.full_name.trim().split(' ')[0] : 'Agente';
    
    // ARMAR LINK DEL PORTAFOLIO / TARJETA DIGITAL
    const linkTarjeta = agent.username 
    ? `${BASE_DOMAIN}/agent/${agent.username}/card?lang=es` 
    : BASE_DOMAIN;

    // PROMPT ACTUALIZADO CON EMOJIS, PRIMER NOMBRE Y LINKS
    const messages: any[] = [
      {
        role: "system",
        content: `Eres FlowIA, el copiloto inmobiliario virtual exclusivo de FlowEstateAI. Estás asistiendo directamente a tu agente, ${primerNombre}.
        
        Tus directrices de comportamiento:
        1. Personalización: Dirígete al agente exclusivamente por su primer nombre (${primerNombre}). Nunca uses sus apellidos.
        2. Tarjeta Digital / Portafolio: Si el agente te pide el enlace de su tarjeta de presentación o portafolio, entrégale este link: ${linkTarjeta}
        3. Formato Atractivo: Cuando listes o describas propiedades, SIEMPRE utiliza emojis (🏡, 📍, 💰, 🛏️, 📐, etc.) para que la lectura sea dinámica y visualmente agradable.
        4. Links de Propiedades: SIEMPRE incluye el enlace web de la propiedad al final de su descripción. Utiliza el campo 'property_url' que te llegará en los datos de la búsqueda.
        5. Manejo estricto de Divisas: Respeta la divisa original de cada registro (₡ o $). No asumas la moneda.
        6. Claridad: No inventes propiedades ni enlaces, utiliza siempre los datos de la herramienta 'buscar_propiedades'.`
      },
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

    if (responseMessage.tool_calls) {
      const toolCall = responseMessage.tool_calls[0];
      const args = JSON.parse(toolCall.function.arguments);

      // Agregamos 'slug' al select para poder construir la URL de la propiedad
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
        // INYECTAMOS LA URL CREADA CON EL SLUG EN CADA PROPIEDAD
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

      const finalResponseText = finalCompletion.choices[0].message.content || "Lo siento, tuve un error al procesar los datos.";
      await sendWhatsAppMessage(cleanNumber, finalResponseText);
      return NextResponse.json({ success: true, status: 'replied_with_data' });

    } else {
      const textResponse = responseMessage.content || `Hola ${primerNombre}, ¿en qué puedo ayudarte hoy con tus propiedades?`;
      await sendWhatsAppMessage(cleanNumber, textResponse);
      return NextResponse.json({ success: true, status: 'replied_direct' });
    }

  } catch (error) {
    console.error('❌ Error crítico en el webhook:', error);
    return NextResponse.json({ success: true, error: 'Internal Server Error' });
  }
}