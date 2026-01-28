import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Obtener página vinculada del agente
    const { data: agent, error: agentError } = await supabaseAdmin
      .from('agents')
      .select('facebook_page_id, facebook_access_token')
      .eq('email', session.user.email)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agente no encontrado' }, { status: 404 });
    }

    if (!agent.facebook_page_id || !agent.facebook_access_token) {
      return NextResponse.json(
        { error: 'No hay página de Facebook vinculada' },
        { status: 400 }
      );
    }

    console.log('📱 Obteniendo posts de página:', agent.facebook_page_id);

    // Llamar a Graph API para obtener posts
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${agent.facebook_page_id}/posts?` +
      `fields=id,message,full_picture,attachments{media,subattachments},created_time,permalink_url` +
      `&limit=20` +
      `&access_token=${agent.facebook_access_token}`
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Error de Facebook API:', errorData);
      throw new Error(errorData.error?.message || 'Error al obtener posts de Facebook');
    }

    const data = await response.json();

    if (!data.data || data.data.length === 0) {
      return NextResponse.json({
        success: true,
        posts: [],
        message: 'No se encontraron posts en tu página',
      });
    }

    // Formatear posts para el frontend
    const posts = data.data.map((post: any) => {
      // Contar imágenes
      let imageCount = 0;
      if (post.attachments?.data) {
        for (const attachment of post.attachments.data) {
          if (attachment.media?.image) {
            imageCount = 1; // Imagen principal
          }
          if (attachment.subattachments?.data) {
            imageCount += attachment.subattachments.data.length;
          }
        }
      }

      return {
        id: post.id,
        message: post.message || '',
        thumbnail: post.full_picture || null,
        created_time: new Date(post.created_time).toLocaleDateString('es-ES', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        image_count: imageCount,
        has_images: imageCount > 0,
        permalink_url: post.permalink_url,
      };
    });

    console.log(`✅ ${posts.length} posts obtenidos`);

    return NextResponse.json({
      success: true,
      posts,
      count: posts.length,
    });

  } catch (error: any) {
    console.error('❌ Error listando posts:', error);
    return NextResponse.json(
      { error: error.message || 'Error al cargar posts de Facebook' },
      { status: 500 }
    );
  }
}