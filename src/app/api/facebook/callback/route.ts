import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getFacebookPages } from '@/lib/facebook';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // email del usuario
    const error = searchParams.get('error');

    if (error) {
      console.error('Error de Facebook:', error);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings/facebook?error=denied`);
    }

    if (!code || !state) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings/facebook?error=invalid`);
    }

    // Intercambiar code por access token
    const tokenResponse = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?` +
      `client_id=${process.env.FACEBOOK_APP_ID}&` +
      `client_secret=${process.env.FACEBOOK_APP_SECRET}&` +
      `code=${code}&` +
      `redirect_uri=${encodeURIComponent(`${process.env.NEXT_PUBLIC_APP_URL}/api/facebook/callback`)}`
    );

    if (!tokenResponse.ok) {
      throw new Error('Error al obtener access token');
    }

    const tokenData = await tokenResponse.json();
    const userAccessToken = tokenData.access_token;

    // Obtener páginas del usuario
    const pages = await getFacebookPages(userAccessToken);

    if (pages.length === 0) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings/facebook?error=no_pages`);
    }

    // Usar la primera página (o permitir que el usuario elija después)
    const selectedPage = pages[0];

    // Guardar en base de datos
    const { error: dbError } = await supabaseAdmin
      .from('agents')
      .update({
        facebook_page_id: selectedPage.id,
        facebook_page_name: selectedPage.name,
        facebook_access_token: selectedPage.access_token,
        facebook_connected_at: new Date().toISOString(),
      })
      .eq('email', state);

    if (dbError) {
      console.error('Error guardando en BD:', dbError);
      throw new Error('Error al guardar configuración');
    }

    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings/facebook?success=true`);
  } catch (error: any) {
    console.error('Error en callback:', error);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings/facebook?error=server`);
  }
}