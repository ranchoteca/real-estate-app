import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    console.log('📥 Callback params:', Object.fromEntries(searchParams));

    const isSuccess = searchParams.get('isSuccess');
    const accountIds = searchParams.get('accountIds');

    if (isSuccess !== 'true' || !accountIds) {
      console.error('Callback sin éxito o sin accountIds');
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings/facebook?error=denied`
      );
    }

    // Tomar el primer account ID (puede venir varios separados por coma)
    const accountId = accountIds.split(',')[0].trim();

    // Consultar Post for Me para obtener los detalles de la cuenta
    // incluyendo el external_id (email del agente) que pasamos al crear la auth URL
    const accountResponse = await fetch(
      `https://api.postforme.dev/v1/social-accounts?id=${accountId}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.POSTFORME_API_KEY}`,
        },
      }
    );

    if (!accountResponse.ok) {
      console.error('Error consultando cuenta en Post for Me');
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings/facebook?error=server`
      );
    }

    const accountsData = await accountResponse.json();
    console.log('📋 Account data:', JSON.stringify(accountsData, null, 2));

    const account = accountsData.data?.[0];

    if (!account) {
      console.error('No se encontró la cuenta:', accountId);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings/facebook?error=server`
      );
    }

    const agentEmail = account.external_id;
    const username = account.username || null;

    if (!agentEmail) {
      console.error('La cuenta no tiene external_id (email del agente)');
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings/facebook?error=server`
      );
    }

    // Guardar en Supabase
    const { error: dbError } = await supabaseAdmin
      .from('agents')
      .update({
        postforme_account_id: accountId,
        postforme_username: username,
        facebook_connected_at: new Date().toISOString(),
      })
      .eq('email', agentEmail);

    if (dbError) {
      console.error('Error guardando en BD:', dbError);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings/facebook?error=server`
      );
    }

    console.log('✅ Cuenta conectada:', accountId, 'para agente:', agentEmail);

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings/facebook?success=true`
    );
  } catch (error: any) {
    console.error('Error en callback:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings/facebook?error=server`
    );
  }
}