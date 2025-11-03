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
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const appId = process.env.FACEBOOK_APP_ID;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/facebook/callback`;
    
    console.log('🔵 [Facebook Auth] App ID:', appId?.substring(0, 10) + '...');
    console.log('🔵 [Facebook Auth] Redirect URI:', redirectUri);
    
    const scope = 'pages_show_list,pages_read_engagement,pages_manage_posts';
    
    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=${session.user.email}`;

    console.log('✅ [Facebook Auth] URL generada:', authUrl.substring(0, 100) + '...');
    
    return NextResponse.json({ authUrl });
  } catch (error: any) {
    console.error('🔴 [Facebook Auth] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}