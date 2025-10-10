import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const subscriptionId = searchParams.get('subscription_id');

    if (!subscriptionId) {
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/pricing?error=missing_id`);
    }

    // Aquí actualizarías el plan del usuario en Supabase
    // Por ahora, solo redirigimos con éxito

    console.log('✅ Subscription activated:', subscriptionId);

    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?success=subscribed`);

  } catch (error: any) {
    console.error('Error handling success:', error);
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/pricing?error=unknown`);
  }
}