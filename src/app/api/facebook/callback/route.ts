import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // Log para ver qué manda Post for Me (útil las primeras veces)
    console.log('📥 Callback params:', Object.fromEntries(searchParams));

    const error = searchParams.get('error');
    if (error) {
      console.error('Error OAuth Post for Me:', error);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings/facebook?error=denied`
      );
    }

    // Recuperar la cuenta usando el external_id (email del agente)
    // que pasamos al crear la auth URL
    const externalId = searchParams.get('external_id');

    if (!externalId) {
      console.error('No se recibió external_id en callback');
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings/facebook?error=invalid`
      );
    }

    // Buscar la cuenta recién conectada por external_id
    const accountsResponse = await fetch(
      `https://api.postforme.dev/v1/social-accounts?external_id=${encodeURIComponent(externalId)}&platform=facebook&status=connected`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.POSTFORME_API_KEY}`,
        },
      }
    );

    if (!accountsResponse.ok) {
      console.error('Error consultando cuentas en Post for Me');
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings/facebook?error=server`
      );
    }

    const accountsData = await accountsResponse.json();
    console.log('📋 Cuentas encontradas:', JSON.stringify(accountsData, null, 2));

    const account = accountsData.data?.[0];

    if (!account) {
      console.error('No se encontró cuenta conectada para:', externalId);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings/facebook?error=server`
      );
    }

    // Guardar en Supabase
    const { error: dbError } = await supabaseAdmin
      .from('agents')
      .update({
        postforme_account_id: account.id,         // "spc_xxxxxx"
        postforme_username: account.username,      // nombre de la página/cuenta
        facebook_connected_at: new Date().toISOString(),
      })
      .eq('email', externalId);

    if (dbError) {
      console.error('Error guardando en BD:', dbError);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings/facebook?error=server`
      );
    }

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