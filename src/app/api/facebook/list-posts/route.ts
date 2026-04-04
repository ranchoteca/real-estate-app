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

    // Obtener agente con ambos campos que necesitamos
    const { data: agent, error: agentError } = await supabaseAdmin
      .from('agents')
      .select('id, postforme_account_id')
      .eq('email', session.user.email)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agente no encontrado' }, { status: 404 });
    }

    if (!agent.postforme_account_id) {
      return NextResponse.json(
        { error: 'No hay página de Facebook vinculada' },
        { status: 400 }
      );
    }

    console.log('📱 Obteniendo posts de cuenta Post for Me:', agent.postforme_account_id);

    // Obtener posts del feed de la cuenta
    const response = await fetch(
      `https://api.postforme.dev/v1/social-account-feeds/${agent.postforme_account_id}?limit=50`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.POSTFORME_API_KEY}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Error de Post for Me API:', errorData);
      throw new Error(errorData.message || 'Error al obtener posts');
    }

    const data = await response.json();
    const rawPosts = data.data || [];

    if (rawPosts.length === 0) {
      return NextResponse.json({
        success: true,
        posts: [],
        message: 'No se encontraron posts en tu página',
      });
    }

    // Obtener qué posts ya fueron importados por este agente
    const platformPostIds = rawPosts
      .map((p: any) => p.platform_post_id)
      .filter(Boolean);

    const { data: importedPosts } = await supabaseAdmin
      .from('facebook_posts')
      .select('facebook_post_id')
      .eq('agent_id', agent.id)
      .in('facebook_post_id', platformPostIds);

    const importedIds = new Set(
      (importedPosts || []).map(p => p.facebook_post_id)
    );

    // Formatear posts para el frontend
    const posts = rawPosts.map((post: any) => {
      const mediaItems = Array.isArray(post.media) ? post.media.flat() : [];
      const imageCount = mediaItems.length;
      const thumbnail = mediaItems[0]?.url || null;

      // Detectar si los media son solo videos (no imágenes)
      const imageItems = mediaItems.filter((m: any) => {
        const url = m?.url || '';
        return !url.match(/\.(mp4|mov|avi|webm|mkv)/i);
      });
      const onlyVideos = mediaItems.length > 0 && imageItems.length === 0;

      return {
        id: post.platform_post_id,
        message: post.caption || '',
        thumbnail,
        created_time: new Date(post.posted_at).toLocaleDateString('es-ES', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        image_count: imageItems.length,
        has_images: imageItems.length > 0,
        only_videos: onlyVideos,
        permalink_url: post.platform_url || null,
        already_imported: importedIds.has(post.platform_post_id),
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