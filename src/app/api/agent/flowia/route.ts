import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import OpenAI from 'openai';

// Inicializamos el cliente de OpenAI tal como lo tienes en tus otras rutas
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Función auxiliar para enviar el mensaje por Wasender
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

    // 1. Filtro de Seguridad: Traemos también el 'id' para poder buscar sus propiedades
    const { data: agent, error } = await supabaseAdmin
      .from('agents')
      .select('id, email, is_flowia_active')
      .or(`whatsapp_number.eq.${searchNumberWithPlus},whatsapp_number.eq.${cleanNumber}`)
      .single();

    if (error || !agent || !agent.is_flowia_active) {
      return NextResponse.json({ success: true, status: 'ignored_unauthorized_or_inactive' }); 
    }

    console.log(`✅ Procesando mensaje de: ${agent.email}`);

    // --- INICIO DEL CEREBRO: OPENAI Y FUNCTION CALLING ---

    // Definimos el comportamiento de FlowIA
    const messages: any[] = [
      {
        role: "system",
        content: "Eres FlowIA, el asistente inmobiliario virtual de la plataforma Flow Estate AI. Ayudas al agente a consultar sus propiedades. Sé conciso y profesional. Recuerda que los montos principales se manejan en colones costarricenses (₡) o dolares ($) dependiendo de la divisa de la propiedad. No inventes propiedades, utiliza siempre la herramienta 'buscar_propiedades' para consultar la base de datos."
      },
      { role: "user", content: messageText }
    ];

    // Le enseñamos a OpenAI la estructura de tu base de datos
    const tools = [
      {
        type: "function" as const,
        function: {
          name: "buscar_propiedades",
          description: "Busca propiedades en la base de datos del agente según filtros.",
          parameters: {
            type: "object",
            properties: {
              ubicacion: { type: "string", description: "Ubicación o ciudad (ej. Escazú, Liberia)" },
              tipo_transaccion: { type: "string", description: "Venta o alquiler" },
            },
          },
        },
      },
    ];

    // Primera llamada a la IA: "Analiza el mensaje y dime si necesitas usar la herramienta"
    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // Puedes usar gpt-4o-mini para mayor velocidad y menor costo
      messages: messages,
      tools: tools,
      tool_choice: "auto",
    });

    const responseMessage = completion.choices[0].message;

    // ¿La IA decidió llamar a la función?
    if (responseMessage.tool_calls) {
      const toolCall = responseMessage.tool_calls[0];
      const args = JSON.parse(toolCall.function.arguments);
      
      console.log("🔍 FlowIA ejecutará búsqueda con:", args);

      // 2. Ejecutar la búsqueda real en Supabase
      let query = supabaseAdmin
        .from('properties')
        .select('title, price, location')
        .eq('agent_id', agent.id) 
        .limit(5);

      if (args.ubicacion) query = query.ilike('location', `%${args.ubicacion}%`);
      // Aquí puedes agregar más filtros a futuro (precio, tipo, etc.)

      const { data: properties, error: dbError } = await query;
      
      if (dbError) console.error("Error consultando propiedades:", dbError);

      // 3. Le pasamos los resultados crudos de Supabase a la IA
      messages.push(responseMessage);
      messages.push({
        tool_call_id: toolCall.id,
        role: "tool",
        name: toolCall.function.name,
        content: JSON.stringify(properties || []),
      });

      // Segunda llamada: "Toma estos datos y redacta el mensaje de WhatsApp"
      const finalCompletion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: messages,
      });

      const finalResponseText = finalCompletion.choices[0].message.content || "Lo siento, tuve un error al procesar los datos.";
      
      // 4. Enviar la respuesta por WhatsApp
      await sendWhatsAppMessage(cleanNumber, finalResponseText);
      
      return NextResponse.json({ success: true, status: 'replied_with_data' });

    } else {
      // Si el agente solo saludó o hizo una pregunta general (no usó herramientas)
      const textResponse = responseMessage.content || "Hola, ¿en qué te puedo ayudar hoy?";
      await sendWhatsAppMessage(cleanNumber, textResponse);
      
      return NextResponse.json({ success: true, status: 'replied_direct' });
    }

  } catch (error) {
    console.error('❌ Error crítico en el webhook:', error);
    return NextResponse.json({ success: true, error: 'Internal Server Error' });
  }
}