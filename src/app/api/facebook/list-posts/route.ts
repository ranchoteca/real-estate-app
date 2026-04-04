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

    const { data: agent, error: agentError } = await supabaseAdmin
      .from('agents')
      .select('postforme_account_id')
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

    const posts = rawPosts.map((post: any) => {
      const mediaItems = Array.isArray(post.media) ? post.media.flat() : [];
      const imageCount = mediaItems.length;
      const thumbnail = mediaItems[0]?.url || null;

      return {
        id: post.platform_post_id,
        message: post.caption || '',
        thumbnail,
        created_time: new Date(post.posted_at).toLocaleDateString('es-ES', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        image_count: imageCount,
        has_images: imageCount > 0,
        permalink_url: post.platform_url || null,
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