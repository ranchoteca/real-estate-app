import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // 1. Extraer los datos del webhook de WhatsSender
    // (Ajustaremos estas variables dependiendo del formato exacto de WhatsSender)
    const senderNumberRaw = body.from || body.sender || ''; 
    const messageText = body.body || body.text || '';

    if (!senderNumberRaw) {
       // Siempre respondemos 200 OK para que WhatsSender no reintente enviar el mensaje
       return NextResponse.json({ success: true, status: 'ignored_no_sender' }); 
    }

    // 2. Limpiar el número entrante
    // WhatsApp suele enviar algo como "50683848980@s.whatsapp.net".
    // Quitamos la terminación y nos aseguramos de buscarlo con y sin el "+"
    const cleanNumber = senderNumberRaw.replace('@s.whatsapp.net', '');
    const searchNumberWithPlus = `+${cleanNumber}`; // Ej: +50683848980

    // 3. El Filtro de Seguridad (Consultar Supabase)
    const { data: agent, error } = await supabaseAdmin
      .from('agents')
      .select('email, is_flowia_active')
      .or(`whatsapp_number.eq.${searchNumberWithPlus},whatsapp_number.eq.${cleanNumber}`)
      .single();

    // Si no existe en la BD o el agente tiene el bot apagado
    if (error || !agent || !agent.is_flowia_active) {
      console.log(`Mensaje ignorado. Número ${cleanNumber} no registrado o inactivo.`);
      return NextResponse.json({ success: true, status: 'ignored_unauthorized_or_inactive' }); 
    }

    // 4. ¡Éxito! Tenemos un agente verificado y activo.
    console.log(`✅ Mensaje recibido del agente autorizado: ${agent.email}`);
    console.log(`📩 Dice: "${messageText}"`);

    // -> AQUÍ IRA EL CÓDIGO DE OPENAI (Function Calling) EN EL PRÓXIMO PASO <-

    return NextResponse.json({ success: true, status: 'processed' });

  } catch (error) {
    console.error('❌ Error crítico en el webhook:', error);
    // Respondemos 200 incluso en error para evitar un bucle de reintentos de WhatsSender
    return NextResponse.json({ success: true, error: 'Internal Server Error' });
  }
}