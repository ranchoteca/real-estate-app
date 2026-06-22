import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Imprimimos el payload por si acaso necesitamos depurar algo más adelante
    console.log('📦 Payload de WhatsSender:', JSON.stringify(body, null, 2));

    // Solo procesamos eventos de mensajes recibidos
    if (body.event !== 'messages.received') {
        return NextResponse.json({ success: true, status: 'ignored_not_message_event' });
    }

    const messagesData = body?.data?.messages;
    if (!messagesData) {
        return NextResponse.json({ success: true, status: 'ignored_no_messages_data' });
    }

    // 1. Extraer los datos usando la estructura exacta de WhatsSender
    const cleanNumber = messagesData.key?.cleanedSenderPn; // Ej: 50683848980
    const messageText = messagesData.messageBody || '';

    if (!cleanNumber) {
       console.log('⚠️ Mensaje ignorado: No se encontró el número del remitente.');
       return NextResponse.json({ success: true, status: 'ignored_no_sender' }); 
    }

    // 2. Preparar el número para Supabase
    // Si el agente guardó el número con '+' (ej: +50683848980), debemos agregarlo para la búsqueda
    const searchNumberWithPlus = cleanNumber.startsWith('+') ? cleanNumber : `+${cleanNumber}`;

    // 3. El Filtro de Seguridad (Consultar Supabase)
    const { data: agent, error } = await supabaseAdmin
      .from('agents')
      .select('email, is_flowia_active')
      .or(`whatsapp_number.eq.${searchNumberWithPlus},whatsapp_number.eq.${cleanNumber}`)
      .single();

    // Si no existe en la BD o el agente tiene el bot apagado
    if (error || !agent || !agent.is_flowia_active) {
      console.log(`🔒 Mensaje ignorado. Número ${searchNumberWithPlus} no registrado o inactivo.`);
      return NextResponse.json({ success: true, status: 'ignored_unauthorized_or_inactive' }); 
    }

    // 4. ¡Éxito! Tenemos un agente verificado y activo.
    console.log(`✅ Mensaje de agente autorizado: ${agent.email}`);
    console.log(`📩 Contenido: "${messageText || '[Archivo Adjunto]'}"`);

    // -> AQUÍ IRA EL CÓDIGO DE OPENAI (Function Calling) <-

    return NextResponse.json({ success: true, status: 'processed' });

  } catch (error) {
    console.error('❌ Error crítico en el webhook:', error);
    return NextResponse.json({ success: true, error: 'Internal Server Error' });
  }
}