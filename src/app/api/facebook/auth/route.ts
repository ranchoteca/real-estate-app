import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(req: NextRequest) {
  try {
    console.log('🔵 [Facebook Auth] Iniciando...');
    
    const session = await getServerSession(authOptions);
    console.log('🔵 [Facebook Auth] Session:', session?.user?.email);
    
    if (!session?.user?.email) {
      console.log('🔴 [Facebook Auth] No autenticado');
      // Redirigir a login si no está autenticado
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/login`);
    }

    const appId = process.env.FACEBOOK_APP_ID;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/facebook/callback`;
    
    console.log('🔵 [Facebook Auth] App ID:', appId?.substring(0, 10) + '...');
    console.log('🔵 [Facebook Auth] Redirect URI:', redirectUri);
    
    const scope = 'pages_show_list,pages_read_engagement,pages_manage_posts';
    
    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=${session.user.email}`;

    console.log('✅ [Facebook Auth] Redirigiendo a Facebook...');
    
    // ✅ Redirigir directamente a Facebook
    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    console.error('🔴 [Facebook Auth] Error:', error);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings/facebook?error=server`);
  }
}