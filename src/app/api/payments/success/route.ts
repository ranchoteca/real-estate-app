import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const subscriptionId = searchParams.get('subscription_id');
    const token = searchParams.get('token'); // PayPal token

    if (!subscriptionId && !token) {
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/pricing?error=missing_id`);
    }

    // Obtener detalles de la suscripción desde PayPal
    const paypalSubId = subscriptionId || token;
    
    // Extraer email del custom_id (lo enviamos en create-subscription)
    // Por simplicidad, buscar la suscripción pendiente en Supabase
    
    console.log('✅ Subscription activated:', paypalSubId);
    
    // ACTUALIZAR: Cambiar plan del agente a 'pro'
    // Por ahora, asumimos que el último agente que inició checkout es el que debe actualizarse
    // En producción, deberías guardar un "pending_subscription" temporal con el email
    
    // Redirigir con éxito - el webhook manejará la actualización real
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?success=subscribed`);

  } catch (error: any) {
    console.error('Error handling success:', error);
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/pricing?error=unknown`);
  }
}