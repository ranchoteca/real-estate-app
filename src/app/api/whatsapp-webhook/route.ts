import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
      .select('id, email, is_flowia_active')
      .or(`whatsapp_number.eq.${searchNumberWithPlus},whatsapp_number.eq.${cleanNumber}`)
      .single();

    if (error || !agent || !agent.is_flowia_active) {
      return NextResponse.json({ success: true, status: 'ignored_unauthorized_or_inactive' }); 
    }

    console.log(`✅ Procesando mensaje de: ${agent.email}`);

    const messages: any[] = [
      {
        role: "system",
        content: "Eres FlowIA, el copiloto inmobiliario virtual. Ayudas al agente a consultar sus propiedades. Sé conciso y profesional. Recuerda que los montos principales se manejan en colones costarricenses (₡). No inventes propiedades, utiliza siempre la herramienta 'buscar_propiedades' para consultar los registros reales."
      },
      { role: "user", content: messageText }
    ];

    const tools = [
      {
        type: "function" as const,
        function: {
          name: "buscar_propiedades",
          description: "Busca e identifica las propiedades asignadas al agente. Si el usuario pide ver todas sus propiedades o no especifica filtros, ejecuta esta función con un objeto vacío o sin parámetros.",
          parameters: {
            type: "object",
            properties: {
              ubicacion: { 
                type: "string", 
                description: "OPCIONAL. Ciudad, provincia o zona para filtrar (ej. 'Santa Cruz', 'Guanacaste', 'San Carlos'). Déjalo vacío si pide listar todo." 
              },
              tipo_transaccion: { 
                type: "string", 
                description: "OPCIONAL. Tipo de listado.",
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
      
      console.log("🔍 FlowIA ejecutará búsqueda con argumentos:", args);

      let query = supabaseAdmin
        .from('properties')
        .select('title, price, city, address, location, property_type, listing_type')
        .eq('agent_id', agent.id) 
        .limit(10);

      // Filtro de ubicación flexible multi-columna
      if (args.ubicacion) {
        query = query.or(`city.ilike.%${args.ubicacion}%,address.ilike.%${args.ubicacion}%,location.ilike.%${args.ubicacion}%,title.ilike.%${args.ubicacion}%,state.ilike.%${args.ubicacion}%`);
      }

      // Mapeo e inserción del filtro de tipo de transacción (Venta -> sale, Alquiler -> rent)
      if (args.tipo_transaccion) {
        const dbListingType = args.tipo_transaccion.toLowerCase() === 'alquiler' ? 'rent' : 'sale';
        query = query.eq('listing_type', dbListingType);
      }

      const { data: properties, error: dbError } = await query;
      
      if (dbError) console.error("Error consultando propiedades:", dbError);
      console.log(`📊 Propiedades encontradas en DB para agent_id [${agent.id}]:`, properties?.length || 0);

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
      const textResponse = responseMessage.content || "Hola, ¿en qué te puedo ayudar hoy?";
      await sendWhatsAppMessage(cleanNumber, textResponse);
      return NextResponse.json({ success: true, status: 'replied_direct' });
    }

  } catch (error) {
    console.error('❌ Error crítico en el webhook:', error);
    return NextResponse.json({ success: true, error: 'Internal Server Error' });
  }
}