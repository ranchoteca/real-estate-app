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
    // ✅ Si hay imagen, publicar como FOTO (no como feed con picture)
    if (imageUrl) {
      const params = {
        url: imageUrl, // URL de la imagen
        caption: `${message}\n\n🔗 Ver más: ${link}`, // Mensaje + link en el caption
        access_token: pageAccessToken,
      };

      const formBody = new URLSearchParams(params);

      const response = await fetch(
        `${FACEBOOK_GRAPH_URL}/${pageId}/photos`, // ← endpoint de /photos
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
        console.error('Error de Facebook API (foto):', error);
        throw new Error(error.error?.message || 'Error al publicar foto');
      }

      return await response.json();
    }

    // ✅ Sin imagen, publicar como enlace normal (solo link)
    const params = {
      message,
      link,
      access_token: pageAccessToken,
      // ❌ NO incluir "picture" aquí - causa el error #100
    };

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
      console.error('Error de Facebook API (feed):', error);
      throw new Error(error.error?.message || 'Error al publicar');
    }

    return await response.json();
  } catch (error) {
    console.error('Error en publishToFacebookPage:', error);
    throw error;
  }
}