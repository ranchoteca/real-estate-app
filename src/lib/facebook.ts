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
export async function publishViaPostForMe(
  accountId: string,
  caption: string,
  mediaUrls: string[]
) {
  const payload = {
    caption,
    social_accounts: [accountId],
    media: mediaUrls.slice(0, 10).map(url => ({ url })),
    platform_configurations: {
      facebook: {
        set_caption_for_each_image: false
      }
    }
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
    console.error('❌ Error de Post For Me API directa:', errorData);
    throw new Error(errorData.message || 'Error al publicar vía API directa de Post For Me');
  }

  const post = await response.json();
  return post;
}