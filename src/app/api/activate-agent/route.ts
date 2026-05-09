// src/app/api/activate-agent/route.ts

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { addDays } from 'date-fns';
import { sendPaymentConfirmedEmail } from '@/lib/emails';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const {
      agentId,
      months = 1,
      reference,
      paymentMethod = 'sinpe',
      amount = null,
      invoiceNumber = null,
      notes = null,
      createdBy = null,
    } = await request.json();

    const expirationDate = addDays(new Date(), 30 * months);

    // 1. Actualizar el agente a Pro
    const { data, error } = await supabaseAdmin
      .from('agents')
      .update({
        plan: 'pro',
        expires_at: expirationDate.toISOString(),
        plan_started_at: new Date().toISOString(),
        last_payment_reference: reference,
      })
      .eq('id', agentId)
      .select()
      .single();

    if (error) throw error;

    // 2. Insertar en historial de pagos
    const { error: historyError } = await supabaseAdmin
      .from('payment_history')
      .insert({
        agent_id: agentId,
        reference,
        payment_method: paymentMethod,
        amount,
        months,
        expires_at: expirationDate.toISOString(),
        invoice_number: invoiceNumber,
        notes,
        created_by: createdBy,
      });

    if (historyError) throw historyError;

    // 3. Enviar correo de confirmación
    // El correo NO revierte el pago si falla. El pago ya quedó guardado.
    const emailResult = await sendPaymentConfirmedEmail({
      to: data.email,
      agentName: data.full_name || 'Agente',
      reference,
      amount,
      expiresAt: expirationDate,
    });

    return NextResponse.json({
      success: true,
      data,
      // Informamos al admin si el correo falló, sin que afecte el resultado del pago
      emailSent: emailResult.success,
      ...(emailResult.success === false && { emailError: emailResult.error }),
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}