import PostForMe from 'post-for-me';

export const postForMeClient = new PostForMe({
  apiKey: process.env.POSTFORME_API_KEY!,
});

// Obtener auth URL para que el agente conecte su Facebook
// external_id = email del agente, lo recibiremos de vuelta en el callback
export async function getPostForMeAuthUrl(agentEmail: string): Promise<string> {
  const response = await fetch('https://api.postforme.dev/v1/social-accounts/auth-url', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.POSTFORME_API_KEY}`,
    },
    body: JSON.stringify({
      platform: 'facebook',
      external_id: agentEmail,
      redirect_url_override: `${process.env.NEXT_PUBLIC_APP_URL}/api/facebook/callback`,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al obtener URL de autenticación');
  }

  const data = await response.json();
  return data.url;
}

// Desconectar cuenta en Post for Me
export async function disconnectPostForMeAccount(accountId: string): Promise<void> {
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
    throw new Error(error.message || 'Error al desconectar cuenta');
  }
}

// Publicar en Facebook via Post for Me
// Las imágenes son URLs públicas de Supabase, se pasan directo sin re-subir
export async function publishViaPostForMe(
  accountId: string,
  caption: string,
  mediaUrls: string[]
) {
  const post = await postForMeClient.socialPosts.create({
    caption,
    social_accounts: [accountId],
    media: mediaUrls.slice(0, 10).map(url => ({ url })),
  });

  return post;
}