import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const eventType = body.event_type;

    console.log('📥 PayPal Webhook:', eventType);

    // BILLING.SUBSCRIPTION.ACTIVATED - Usuario aprobó suscripción
    if (eventType === 'BILLING.SUBSCRIPTION.ACTIVATED') {
      const subscription = body.resource;
      const email = subscription.custom_id; // Email que enviamos en create-subscription
      const subscriptionId = subscription.id;

      console.log('✅ Activando plan Pro para:', email);

      // Actualizar agente a plan Pro
      const { error } = await supabaseAdmin
        .from('agents')
        .update({
          plan: 'pro',
          properties_this_month: 0,
          plan_started_at: new Date().toISOString(),
          paypal_subscription_id: subscriptionId,
        })
        .eq('email', email);

      if (error) {
        console.error('❌ Error actualizando plan:', error);
        return NextResponse.json({ error: 'Error updating plan' }, { status: 500 });
      }

      console.log('✅ Plan Pro activado para:', email);
    }

    // BILLING.SUBSCRIPTION.CANCELLED - Usuario canceló
    if (eventType === 'BILLING.SUBSCRIPTION.CANCELLED') {
      const subscription = body.resource;
      const subscriptionId = subscription.id;

      console.log('⚠️ Cancelando suscripción:', subscriptionId);

      // Volver a plan Free
      const { error } = await supabaseAdmin
        .from('agents')
        .update({
          plan: 'free',
          properties_this_month: 0,
          paypal_subscription_id: null,
        })
        .eq('paypal_subscription_id', subscriptionId);

      if (error) {
        console.error('❌ Error cancelando plan:', error);
        return NextResponse.json({ error: 'Error cancelling plan' }, { status: 500 });
      }

      console.log('✅ Plan cancelado, volvió a Free');
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('❌ Webhook error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Deshabilitar body parser para webhooks
export const config = {
  api: {
    bodyParser: false,
  },
};