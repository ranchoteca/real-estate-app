import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const appId = process.env.FACEBOOK_APP_ID;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/facebook/callback`;
    
    const scope = 'pages_show_list,pages_read_engagement,pages_manage_posts';
    
    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=${session.user.email}`;

    // Devolver la URL en lugar de redirigir
    return NextResponse.json({ authUrl });
  } catch (error: any) {
    console.error('Error en Facebook auth:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}