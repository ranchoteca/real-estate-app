import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return Response.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/login`);
    }

    const appId = process.env.FACEBOOK_APP_ID;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/facebook/callback`;
    const scope = 'pages_show_list,pages_read_engagement,pages_manage_posts';
    
    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=${encodeURIComponent(session.user.email)}`;

    // ✅ Redirect 302 directo a Facebook
    return Response.redirect(authUrl, 302);
  } catch (error: any) {
    console.error('Error:', error);
    return Response.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings/facebook?error=server`, 302);
  }
}