// Obtener auth URL para que el agente conecte su TikTok
// external_id = email del agente, lo recibiremos de vuelta en el callback
export async function getTikTokAuthUrl(agentEmail: string): Promise<string> {
  const response = await fetch('https://api.postforme.dev/v1/social-accounts/auth-url', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.POSTFORME_API_KEY}`,
    },
    body: JSON.stringify({
      platform: 'tiktok',
      external_id: agentEmail,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al obtener URL de autenticación de TikTok');
  }

  const data = await response.json();
  return data.url;
}

// Desconectar cuenta TikTok en Post for Me
export async function disconnectTikTokAccount(accountId: string): Promise<void> {
  const response = await fetch(
    `https://api.postforme.dev/v1/social-accounts/${accountId}/disconnect`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.POSTFORME_API_KEY}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al desconectar cuenta de TikTok');
  }
}

// Publicar video corto en TikTok via Post for Me
export async function publishTikTokVideo(
  accountId: string,
  caption: string,
  videoUrl: string
) {
  const payload = {
    caption,
    social_accounts: [accountId],
    media: [{ url: videoUrl }],
  };

  const response = await fetch('https://api.postforme.dev/v1/social-posts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.POSTFORME_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('❌ Error de Post For Me API (TikTok):', errorData);
    throw new Error(errorData.message || 'Error al publicar video en TikTok');
  }

  const post = await response.json();
  return post;
}