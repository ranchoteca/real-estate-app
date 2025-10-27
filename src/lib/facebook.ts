const FACEBOOK_API_VERSION = 'v18.0';
const FACEBOOK_GRAPH_URL = `https://graph.facebook.com/${FACEBOOK_API_VERSION}`;

export interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
}

// Obtener páginas del usuario
export async function getFacebookPages(userAccessToken: string): Promise<FacebookPage[]> {
  try {
    const response = await fetch(
      `${FACEBOOK_GRAPH_URL}/me/accounts?access_token=${userAccessToken}`
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Error al obtener páginas');
    }
    
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error en getFacebookPages:', error);
    throw error;
  }
}

// Publicar en página de Facebook
export async function publishToFacebookPage(
  pageAccessToken: string,
  pageId: string,
  message: string,
  link: string,
  imageUrl?: string
) {
  try {
    const params: any = {
      message,
      link,
      access_token: pageAccessToken,
    };

    // Si hay imagen, usarla como foto adjunta
    if (imageUrl) {
      params.picture = imageUrl;
    }

    const formBody = new URLSearchParams(params);

    const response = await fetch(
      `${FACEBOOK_GRAPH_URL}/${pageId}/feed`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formBody.toString(),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('Error de Facebook API:', error);
      throw new Error(error.error?.message || 'Error al publicar');
    }

    return await response.json();
  } catch (error) {
    console.error('Error en publishToFacebookPage:', error);
    throw error;
  }
}