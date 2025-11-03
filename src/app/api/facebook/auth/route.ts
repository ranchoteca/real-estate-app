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

    // ✅ SOLUCIÓN PWA: Retornar HTML con redirección JavaScript
    // Esto evita el bloqueo de las PWAs en redirecciones server-side
    return new Response(
      `<!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Conectando con Facebook...</title>
          <style>
            body {
              margin: 0;
              padding: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            .container {
              text-align: center;
              color: white;
              padding: 2rem;
            }
            .spinner {
              width: 50px;
              height: 50px;
              margin: 0 auto 1.5rem;
              border: 4px solid rgba(255,255,255,0.3);
              border-top-color: white;
              border-radius: 50%;
              animation: spin 1s linear infinite;
            }
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
            .icon {
              font-size: 4rem;
              margin-bottom: 1rem;
            }
            h1 {
              font-size: 1.5rem;
              margin: 0 0 0.5rem 0;
              font-weight: 600;
            }
            p {
              font-size: 1rem;
              opacity: 0.9;
              margin: 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">📘</div>
            <div class="spinner"></div>
            <h1>Redirigiendo a Facebook...</h1>
            <p>Por favor espera un momento</p>
          </div>
          <script>
            // ✅ Redirección inmediata que funciona en PWAs
            window.location.href = ${JSON.stringify(authUrl)};
            
            // ✅ Fallback por si la PWA bloquea la primera redirección
            setTimeout(function() {
              window.location.replace(${JSON.stringify(authUrl)});
            }, 100);
          </script>
        </body>
      </html>`,
      {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (error: any) {
    console.error('Error:', error);
    return Response.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings/facebook?error=server`, 302);
  }
}