import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    console.log('📥 Social callback params:', Object.fromEntries(searchParams));

    const isSuccess = searchParams.get('isSuccess');
    const accountIds = searchParams.get('accountIds');

    if (isSuccess !== 'true' || !accountIds) {
      console.error('Callback sin éxito o sin accountIds');
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings/social?error=denied&platform=unknown`
      );
    }

    // Tomar el primer account ID (puede venir varios separados por coma)
    const accountId = accountIds.split(',')[0].trim();

    // Consultar Post for Me para obtener los detalles de la cuenta
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
        `${process.env.NEXT_PUBLIC_APP_URL}/settings/social?error=server&platform=unknown`
      );
    }

    const accountsData = await accountResponse.json();
    console.log('📋 Account data:', JSON.stringify(accountsData, null, 2));

    const account = accountsData.data?.[0];

    if (!account) {
      console.error('No se encontró la cuenta:', accountId);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings/social?error=server&platform=unknown`
      );
    }

    const agentEmail = account.external_id;
    const username = account.username || null;
    const platform: string = account.platform || 'unknown';

    if (!agentEmail) {
      console.error('La cuenta no tiene external_id (email del agente)');
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings/social?error=server&platform=${platform}`
      );
    }

    // ── Rutar por plataforma ──────────────────────────────────────────────

    if (platform === 'facebook') {

      console.log('📘 Conectando Facebook para:', agentEmail);

      const { error: dbError } = await supabaseAdmin
        .from('agents')
        .update({
          facebook_account_id: accountId,
          facebook_username: username,
          facebook_connected_at: new Date().toISOString(),
        })
        .eq('email', agentEmail);

      if (dbError) {
        console.error('Error guardando Facebook en BD:', dbError);
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_APP_URL}/settings/social?error=server&platform=facebook`
        );
      }

      console.log('✅ Facebook conectado:', accountId, 'para agente:', agentEmail);

      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings/social?success=true&platform=facebook`
      );

    } else if (platform === 'tiktok') {

      console.log('🎵 Conectando TikTok para:', agentEmail);

      const { error: dbError } = await supabaseAdmin
        .from('agents')
        .update({
          tiktok_account_id: accountId,
          tiktok_username: username,
          tiktok_connected_at: new Date().toISOString(),
        })
        .eq('email', agentEmail);

      if (dbError) {
        console.error('Error guardando TikTok en BD:', dbError);
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_APP_URL}/settings/social?error=server&platform=tiktok`
        );
      }

      console.log('✅ TikTok conectado:', accountId, 'para agente:', agentEmail);

      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings/social?success=true&platform=tiktok`
      );

    } else {

      console.error('Plataforma no soportada:', platform);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings/social?error=server&platform=unknown`
      );

    }

  } catch (error: any) {
    console.error('Error en social callback:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings/social?error=server&platform=unknown`
    );
  }
}