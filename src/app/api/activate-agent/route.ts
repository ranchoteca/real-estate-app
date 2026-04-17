import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { addDays } from 'date-fns';

const resend = new Resend(process.env.RESEND_API_KEY);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { agentId, months = 1, reference } = await request.json();

    const expirationDate = addDays(new Date(), 30 * months);

    // 1. Actualizar base de datos
    const { data, error } = await supabaseAdmin
      .from('agents')
      .update({
        plan: 'pro',
        expires_at: expirationDate.toISOString(),
        plan_started_at: new Date().toISOString(),
        last_payment_reference: reference
      })
      .eq('id', agentId)
      .select()
      .single();

    if (error) throw error;

    // 2. Enviar correo de confirmación
    await resend.emails.send({
      from: 'Flow Estate <onboarding@resend.dev>', // Cambia esto por tu dominio verificado después
      to: data.email,
      subject: '¡Tu cuenta Pro de Flow Estate AI está activa! 🚀',
      html: `
        <h1>¡Hola, ${data.full_name || 'Agente'}!</h1>
        <p>Hemos recibido tu pago vía SINPE (Ref: ${reference}) y tu plan <strong>Pro</strong> ha sido activado.</p>
        <p>Tu suscripción estará vigente hasta el: <strong>${expirationDate.toLocaleDateString()}</strong>.</p>
        <p>Ya puedes disfrutar de todas las herramientas ilimitadas.</p>
        <br />
        <p>Saludos,<br />El equipo de Flow Estate AI</p>
      `,
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}