// app/api/social/poll-result/route.ts
// El cliente llama este endpoint cada 3s para consultar el estado real de un post.
// Cada llamada dura < 1s — sin problema con el límite de Vercel.

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

    const postId     = req.nextUrl.searchParams.get('postId');
    const platform   = req.nextUrl.searchParams.get('platform'); // 'facebook' | 'tiktok'
    const agentId    = req.nextUrl.searchParams.get('agentId');
    const propertyId = req.nextUrl.searchParams.get('propertyId');

    if (!postId || !platform) {
      return NextResponse.json({ error: 'postId y platform requeridos' }, { status: 400 });
    }

    const res = await fetch(
      `https://api.postforme.dev/v1/social-posts/${postId}/results`,
      { headers: { Authorization: `Bearer ${process.env.POSTFORME_API_KEY}` } }
    );

    if (!res.ok) {
      console.warn(`⚠️ Poll [${postId}] non-ok: ${res.status}`);
      return NextResponse.json({ status: 'processing' });
    }

    const data = await res.json();
    console.log(`📊 Poll [${platform}/${postId}]:`, JSON.stringify(data, null, 2));

    const results: any[] = data.data || [];

    // Sin resultados aún — sigue procesando
    if (results.length === 0) {
      return NextResponse.json({ status: 'processing' });
    }

    const result = results[0];

    // Aún procesando
    if (result.success === null || result.success === undefined) {
      return NextResponse.json({ status: 'processing' });
    }

    // Éxito — guardar registro en BD
    if (result.success === true) {
      if (agentId && propertyId) {
        if (platform === 'facebook') {
          await supabaseAdmin.from('facebook_posts').insert({
            property_id: propertyId,
            agent_id: agentId,
            facebook_post_id: postId,
            type: 'reel',
            published_at: new Date().toISOString(),
          }).then(({ error }) => {
            if (error) console.warn('⚠️ Error guardando facebook_posts:', error);
          });
        } else if (platform === 'tiktok') {
          await supabaseAdmin.from('tiktok_posts').insert({
            property_id: propertyId,
            agent_id: agentId,
            tiktok_post_id: postId,
            type: 'video',
            published_at: new Date().toISOString(),
          }).then(({ error }) => {
            if (error) console.warn('⚠️ Error guardando tiktok_posts:', error);
          });
        }
      }
      return NextResponse.json({ status: 'success' });
    }

    // Error de plataforma
    if (result.success === false) {
      return NextResponse.json({
        status: 'error',
        error: result.error || 'Error desconocido en la plataforma',
      });
    }

    return NextResponse.json({ status: 'processing' });

  } catch (err: any) {
    console.error('💥 Error en poll-result:', err);
    return NextResponse.json({ status: 'processing' });
  }
}