import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getTikTokAuthUrl } from '@/lib/tiktok';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const authUrl = await getTikTokAuthUrl(session.user.email);
    return NextResponse.json({ authUrl });
  } catch (error: any) {
    console.error('Error generando auth URL de TikTok:', error);
    return NextResponse.json(
      { error: error.message || 'Error al generar URL de autenticación' },
      { status: 500 }
    );
  }
}