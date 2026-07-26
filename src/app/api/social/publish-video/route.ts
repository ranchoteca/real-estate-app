// app/api/social/publish-video/route.ts
// Endpoint unificado SSE — publica en Facebook Reels, TikTok, o ambos
// y hace polling de resultados contra Post For Me hasta confirmar estado real.

import { NextRequest, NextResponse } from 'next/server';
import { publishReelViaPostForMe } from '@/lib/facebook';
import { publishTikTokVideo } from '@/lib/tiktok';
import { uploadMuxVideoToCloudinary, buildReelWithMusic } from '@/lib/cloudinary';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { supabaseAdmin } from '@/lib/supabase';

// ── Polling Post For Me hasta obtener resultado real ─────────────────────────
async function pollPostResult(
  postId: string,
  timeoutMs = 60_000,
  intervalMs = 3_000
): Promise<{ success: boolean; error?: string }> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, intervalMs));

    try {
      const res = await fetch(
        `https://api.postforme.dev/v1/social-posts/${postId}/results`,
        { headers: { Authorization: `Bearer ${process.env.POSTFORME_API_KEY}` } }
      );

      if (!res.ok) continue;

      const data = await res.json();
      console.log('📊 Poll result raw:', JSON.stringify(data, null, 2));
      const results: any[] = data.data || [];

      if (results.length === 0) continue;

      // Tomamos el primer resultado (un post apunta a una sola cuenta aquí)
      const result = results[0];
      if (result.success === true) return { success: true };
      if (result.success === false) {
        return { success: false, error: result.error || 'Error desconocido en la plataforma' };
      }
      // Si success es null/undefined aún está procesando → seguir polling
    } catch {
      // Error de red puntual → continuar
    }
  }

  // Timeout — no pudimos confirmar en 60s
  return { success: false, error: 'timeout' };
}

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const propertyId   = p.get('propertyId');
  const videoUrl     = p.get('videoUrl');
  const platforms    = p.get('platforms');          // 'facebook' | 'tiktok' | 'both'
  const musicPublicId      = p.get('musicPublicId') || null;
  const keepOriginalAudio  = p.get('keepOriginalAudio') === 'true';
  const volumeParam        = p.get('musicVolume');
  const includeMusicTiktok = p.get('includeMusicTiktok') === 'true';
  const captionFb  = p.get('captionFb')  || '';
  const captionTk  = p.get('captionTk')  || '';

  if (!propertyId || !videoUrl || !platforms) {
    return NextResponse.json({ error: 'Parámetros requeridos: propertyId, videoUrl, platforms' }, { status: 400 });
  }

  return handlePublish({
    propertyId,
    videoUrl,
    platforms: platforms as 'facebook' | 'tiktok' | 'both',
    music: {
      musicPublicId,
      keepOriginalAudio,
      volumeDb: volumeParam ? Number(volumeParam) : -20,
      includeMusicTiktok,
    },
    captionFb,
    captionTk,
  });
}

interface PublishOptions {
  propertyId: string;
  videoUrl: string;
  platforms: 'facebook' | 'tiktok' | 'both';
  music: {
    musicPublicId: string | null;
    keepOriginalAudio: boolean;
    volumeDb: number;
    includeMusicTiktok: boolean;
  };
  captionFb: string;
  captionTk: string;
}

function handlePublish(opts: PublishOptions) {
  const encoder = new TextEncoder();
  const stream  = new TransformStream();
  const writer  = stream.writable.getWriter();

  const send = async (data: object) => {
    try {
      await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
    } catch {}
  };

  (async () => {
    try {
      const session = await getServerSession(authOptions);
      if (!session?.user?.email) {
        await send({ error: 'No autenticado' });
        await writer.close();
        return;
      }

      // ── Verificar plan Pro ────────────────────────────────────────────────
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
        await send({ error: '🔒 Esta función requiere un plan Pro activo.' });
        await writer.close();
        return;
      }

      // ── Cargar agente ─────────────────────────────────────────────────────
      await send({ message: 'Obteniendo datos...', progress: 5 });

      const { data: agent } = await supabaseAdmin
        .from('agents')
        .select('id, full_name, name, phone, facebook_account_id, tiktok_account_id')
        .eq('email', session.user.email)
        .single();

      if (!agent) {
        await send({ error: 'Agente no encontrado' });
        await writer.close();
        return;
      }

      const publishFb = opts.platforms === 'facebook' || opts.platforms === 'both';
      const publishTk = opts.platforms === 'tiktok'   || opts.platforms === 'both';

      if (publishFb && !agent.facebook_account_id) {
        await send({ error: 'Facebook no está conectado. Ve a Configuración → Redes Sociales.' });
        await writer.close();
        return;
      }
      if (publishTk && !agent.tiktok_account_id) {
        await send({ error: 'TikTok no está conectado. Ve a Configuración → Redes Sociales.' });
        await writer.close();
        return;
      }

      // ── Verificar que el video pertenece a la propiedad ───────────────────
      const { data: property } = await supabaseAdmin
        .from('properties')
        .select('id, video_urls')
        .eq('id', opts.propertyId)
        .single();

      if (!property || !(property.video_urls || []).includes(opts.videoUrl)) {
        await send({ error: 'El video no pertenece a esta propiedad' });
        await writer.close();
        return;
      }

      // ── Fusión con música (Cloudinary) ────────────────────────────────────
      let videoForFacebook = opts.videoUrl;
      let videoForTiktok   = opts.videoUrl;

      if (opts.music.musicPublicId) {
        await send({ message: 'Subiendo video a Cloudinary...', progress: 20 });
        const uploaded = await uploadMuxVideoToCloudinary(opts.videoUrl, opts.propertyId);

        await send({ message: 'Fusionando video con música...', progress: 35 });
        const mergedUrl = await buildReelWithMusic(
          uploaded.publicId,
          opts.music.musicPublicId,
          uploaded.durationSeconds,
          {
            keepOriginalAudio: opts.music.keepOriginalAudio,
            volumeDb: opts.music.volumeDb,
          }
        );

        videoForFacebook = mergedUrl;
        // TikTok: usa video con música solo si el agente lo eligió explícitamente
        videoForTiktok = opts.music.includeMusicTiktok ? mergedUrl : opts.videoUrl;
      }

      // ── Publicar en Facebook ──────────────────────────────────────────────
      let fbPostId: string | null = null;

      if (publishFb) {
        await send({ message: 'Publicando en Facebook Reels...', progress: 50, fbStatus: 'publishing' });
        try {
          const fbPost = await publishReelViaPostForMe(
            agent.facebook_account_id!,
            opts.captionFb,
            videoForFacebook
          );
          fbPostId = fbPost.id;

          await send({ message: 'Esperando confirmación de Facebook...', progress: 60, fbStatus: 'processing' });

          const fbResult = await pollPostResult(fbPostId!);

          if (fbResult.success) {
            await send({ fbStatus: 'success', progress: publishTk ? 65 : 90 });
            // Guardar registro
            await supabaseAdmin.from('facebook_posts').insert({
              property_id: opts.propertyId,
              agent_id: agent.id,
              facebook_post_id: fbPostId,
              type: 'reel',
              published_at: new Date().toISOString(),
            }).then(({ error }) => { if (error) console.warn('⚠️ Error guardando facebook_posts:', error); });
          } else if (fbResult.error === 'timeout') {
            await send({ fbStatus: 'timeout', progress: publishTk ? 65 : 90 });
          } else {
            await send({ fbStatus: 'error', fbError: fbResult.error, progress: publishTk ? 65 : 90 });
          }
        } catch (err: any) {
          await send({ fbStatus: 'error', fbError: err.message, progress: publishTk ? 65 : 90 });
        }
      }

      // ── Publicar en TikTok ────────────────────────────────────────────────
      let tkPostId: string | null = null;

      if (publishTk) {
        await send({ message: 'Publicando en TikTok...', progress: 70, tkStatus: 'publishing' });
        try {
          const tkPost = await publishTikTokVideo(
            agent.tiktok_account_id!,
            opts.captionTk,
            videoForTiktok
          );
          tkPostId = tkPost.id;

          await send({ message: 'Esperando confirmación de TikTok...', progress: 80, tkStatus: 'processing' });

          const tkResult = await pollPostResult(tkPostId!);

          if (tkResult.success) {
            await send({ tkStatus: 'success', progress: 90 });
            // Guardar registro
            await supabaseAdmin.from('tiktok_posts').insert({
              property_id: opts.propertyId,
              agent_id: agent.id,
              tiktok_post_id: tkPostId,
              type: 'video',
              published_at: new Date().toISOString(),
            }).then(({ error }) => { if (error) console.warn('⚠️ Error guardando tiktok_posts:', error); });
          } else if (tkResult.error === 'timeout') {
            await send({ tkStatus: 'timeout', progress: 90 });
          } else {
            await send({ tkStatus: 'error', tkError: tkResult.error, progress: 90 });
          }
        } catch (err: any) {
          await send({ tkStatus: 'error', tkError: err.message, progress: 90 });
        }
      }

      // ── Evento final ──────────────────────────────────────────────────────
      await send({ progress: 100, done: true });

    } catch (err: any) {
      console.error('💥 Error en publish-video:', err);
      await send({ error: err.message || 'Error inesperado al publicar' });
    } finally {
      try { await writer.close(); } catch {}
    }
  })();

  return new NextResponse(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}