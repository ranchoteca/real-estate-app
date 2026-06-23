import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// MAPEO DE DIVISAS: Traduce los UUIDs de tu base de datos a datos legibles por la IA
const CURRENCY_MAP: Record<string, { code: string; symbol: string }> = {
  'ec8528a3-d504-47fa-97db-2c07716d8b47': { code: 'CRC', symbol: '₡' }, // Colones
  '839f44d5-bee2-4bc1-b5da-50364f14c681': { code: 'USD', symbol: '$' }  // Dólares
};

// TIPO DE CAMBIO REFERENCIAL
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

    // Traemos el full_name del agente para personalizar las respuestas
    const { data: agent, error } = await supabaseAdmin
      .from('agents')
      .select('id, email, full_name, is_flowia_active')
      .or(`whatsapp_number.eq.${searchNumberWithPlus},whatsapp_number.eq.${cleanNumber}`)
      .single();

    if (error || !agent || !agent.is_flowia_active) {
      return NextResponse.json({ success: true, status: 'ignored_unauthorized_or_inactive' }); 
    }

    const nombreAgente = agent.full_name || 'Agente';

    // PROMPT DINÁMICO Y PERSONALIZADO
    const messages: any[] = [
      {
        role: "system",
        content: `Eres FlowIA, el copiloto inmobiliario virtual exclusivo de FlowEstateAI. Estás asistiendo directamente al agente de bienes raíces llamado ${nombreAgente}.
        
        Tus directrices de comportamiento:
        1. Personalización: Dirígete al agente por su nombre (${nombreAgente}) de forma cordial, natural y profesional en tus saludos o respuestas principales.
        2. Manejo estricto de Divisas: Las propiedades en la base de datos se pueden guardar en Colones (₡) o Dólares ($). Debes respetar la divisa original de cada registro al listar o describir una propiedad. Si viene en dólares, muestra $, si viene en colones, muestra ₡. ¡No inventes ni asumas la moneda!
        3. Claridad y Precisión: Sé conciso, directo y structured. No inventes propiedades, utiliza siempre la herramienta 'buscar_propiedades' para interactuar con los datos reales.`
      },
      { role: "user", content: messageText }
    ];

    // HERRAMIENTA CON FILTROS INTELIGENTES DE DIVISAS
    const tools = [
      {
        type: "function" as const,
        function: {
          name: "buscar_propiedades",
          description: "Busca propiedades del agente aplicando filtros inteligentes de texto, tipo de negocio y presupuestos.",
          parameters: {
            type: "object",
            properties: {
              termino_busqueda: { 
                type: "string", 
                description: "Palabras clave para buscar en títulos, descripciones, ciudades o provincias (ej. 'Bagaces', 'finca')." 
              },
              precio_min: { type: "number", description: "Monto mínimo del presupuesto solicitado." },
              precio_max: { type: "number", description: "Monto máximo del presupuesto solicitado." },
              moneda_referencia: { 
                type: "string", 
                enum: ["CRC", "USD"], 
                description: "La divisa en la que el agente expresó el rango de precio. Si dice 'millones' o 'colones' es CRC. Si dice 'dólares' o '$' es USD." 
              },
              tipo_transaccion: { 
                type: "string", 
                enum: ["venta", "alquiler"]
              },
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
      
      console.log(`🔍 ${nombreAgente} solicitó búsqueda con argumentos:`, args);

      // Consulta base a Supabase
      let query = supabaseAdmin
        .from('properties')
        .select('title, description, price, city, address, state, property_type, listing_type, currency_id')
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

      // MOTOR DE CONVERSIÓN E INYECCIÓN DE DIVISAS
      if (properties && properties.length > 0) {
        properties = properties.map(p => {
          const coin = CURRENCY_MAP[p.currency_id] || { code: 'CRC', symbol: '₡' };
          return {
            ...p,
            currency_code: coin.code,
            currency_symbol: coin.symbol
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

      console.log(`📊 Propiedades tras filtro inteligente de divisas:`, properties?.length || 0);

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
      const textResponse = responseMessage.content || `Hola ${nombreAgente}, ¿en qué puedo ayudarte hoy con tus propiedades?`;
      await sendWhatsAppMessage(cleanNumber, textResponse);
      return NextResponse.json({ success: true, status: 'replied_direct' });
    }

  } catch (error) {
    console.error('❌ Error crítico en el webhook:', error);
    return NextResponse.json({ success: true, error: 'Internal Server Error' });
  }
}