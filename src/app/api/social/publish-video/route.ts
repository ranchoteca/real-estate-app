// app/api/social/publish-video/route.ts
// Publica en Facebook Reels, TikTok, o ambos.
// Devuelve los postIds inmediatamente — el polling lo hace el cliente.

import { NextRequest, NextResponse } from 'next/server';
import { publishReelViaPostForMe } from '@/lib/facebook';
import { publishTikTokVideo } from '@/lib/tiktok';
import { uploadMuxVideoToCloudinary, buildReelWithMusic } from '@/lib/cloudinary';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const {
      propertyId,
      videoUrl,
      platforms,
      musicPublicId,
      keepOriginalAudio,
      musicVolume,
      includeMusicTiktok,
      captionFb,
      captionTk,
    } = await req.json();

    if (!propertyId || !videoUrl || !platforms) {
      return NextResponse.json({ error: 'Parámetros requeridos: propertyId, videoUrl, platforms' }, { status: 400 });
    }

    // ── Verificar plan Pro ──────────────────────────────────────────────────
    const { data: agentPlan } = await supabaseAdmin
      .from('agents')
      .select('plan, role, expires_at')
      .eq('email', session.user.email)
      .single();

    const isPro =
      agentPlan?.role === 'admin' ||
      (agentPlan?.plan === 'pro' &&
        !!agentPlan?.expires_at &&
        new Date(agentPlan.expires_at) > new Date());

    if (!isPro) {
      return NextResponse.json({ error: '🔒 Esta función requiere un plan Pro activo.' }, { status: 403 });
    }

    // ── Cargar agente ───────────────────────────────────────────────────────
    const { data: agent } = await supabaseAdmin
      .from('agents')
      .select('id, full_name, name, phone, facebook_account_id, tiktok_account_id')
      .eq('email', session.user.email)
      .single();

    if (!agent) {
      return NextResponse.json({ error: 'Agente no encontrado' }, { status: 404 });
    }

    const publishFb = platforms === 'facebook' || platforms === 'both';
    const publishTk = platforms === 'tiktok'   || platforms === 'both';

    if (publishFb && !agent.facebook_account_id) {
      return NextResponse.json({ error: 'Facebook no está conectado. Ve a Configuración → Redes Sociales.' }, { status: 400 });
    }
    if (publishTk && !agent.tiktok_account_id) {
      return NextResponse.json({ error: 'TikTok no está conectado. Ve a Configuración → Redes Sociales.' }, { status: 400 });
    }

    // ── Verificar que el video pertenece a la propiedad ────────────────────
    const { data: property } = await supabaseAdmin
      .from('properties')
      .select('id, video_urls')
      .eq('id', propertyId)
      .single();

    if (!property || !(property.video_urls || []).includes(videoUrl)) {
      return NextResponse.json({ error: 'El video no pertenece a esta propiedad' }, { status: 400 });
    }

    // ── Fusión con música (Cloudinary) ──────────────────────────────────────
    let videoForFacebook = videoUrl;
    let videoForTiktok   = videoUrl;

    if (musicPublicId) {
      const uploaded = await uploadMuxVideoToCloudinary(videoUrl, propertyId);
      const mergedUrl = await buildReelWithMusic(
        uploaded.publicId,
        musicPublicId,
        uploaded.durationSeconds,
        {
          keepOriginalAudio: !!keepOriginalAudio,
          volumeDb: typeof musicVolume === 'number' ? musicVolume : -20,
        }
      );
      videoForFacebook = mergedUrl;
      videoForTiktok   = includeMusicTiktok ? mergedUrl : videoUrl;
    }

    // ── Publicar y recoger postIds ──────────────────────────────────────────
    const result: {
      fbPostId?: string;
      tkPostId?: string;
      fbError?: string;
      tkError?: string;
      agentId: string;
      propertyId: string;
    } = { agentId: agent.id, propertyId };

    if (publishFb) {
      try {
        const fbPost = await publishReelViaPostForMe(
          agent.facebook_account_id!,
          captionFb || '',
          videoForFacebook
        );
        result.fbPostId = fbPost.id;
        console.log('📘 Facebook post created:', fbPost.id);
      } catch (err: any) {
        console.error('💥 Facebook publish error:', err.message);
        result.fbError = err.message;
      }
    }

    if (publishTk) {
      try {
        const tkPost = await publishTikTokVideo(
          agent.tiktok_account_id!,
          captionTk || '',
          videoForTiktok
        );
        result.tkPostId = tkPost.id;
        console.log('🎵 TikTok post created:', tkPost.id);
      } catch (err: any) {
        console.error('💥 TikTok publish error:', err.message);
        result.tkError = err.message;
      }
    }

    return NextResponse.json(result);

  } catch (err: any) {
    console.error('💥 Error en publish-video:', err);
    return NextResponse.json({ error: err.message || 'Error inesperado' }, { status: 500 });
  }
}