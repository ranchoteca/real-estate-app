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
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/login`);
    }

    const appId = process.env.FACEBOOK_APP_ID;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/facebook/callback`;
    const scope = 'pages_show_list,pages_read_engagement,pages_manage_posts';
    
    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=${session.user.email}`;

    console.log('✅ [Facebook Auth] URL generada');
    
    // ✅ Usar comillas simples y template literals correctamente
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Conectando con Facebook...</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      background: #1877F2;
      color: white;
    }
    .loader {
      text-align: center;
    }
    .spinner {
      border: 4px solid rgba(255,255,255,0.3);
      border-top: 4px solid white;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin: 0 auto 20px;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  </style>
  <meta http-equiv="refresh" content="1;url=${authUrl}">
</head>
<body>
  <div class="loader">
    <div class="spinner"></div>
    <p>Redirigiendo a Facebook...</p>
  </div>
  <script>
    setTimeout(function() {
      window.location.href = ${JSON.stringify(authUrl)};
    }, 500);
  </script>
</body>
</html>`;
    
    return new NextResponse(html, {
      headers: { 
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  } catch (error: any) {
    console.error('🔴 [Facebook Auth] Error:', error);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings/facebook?error=server`);
  }
}