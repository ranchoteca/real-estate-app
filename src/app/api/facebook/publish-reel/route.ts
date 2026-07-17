// ============================================================
// app/api/facebook/publish-reel/route.ts
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { publishReelViaPostForMe } from '@/lib/facebook';
import { uploadMuxVideoToCloudinary, buildReelWithMusic, deleteCloudinaryVideo } from '@/lib/cloudinary';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { supabaseAdmin } from '@/lib/supabase';

interface MusicOptions {
  musicPublicId: string | null;
  keepOriginalAudio: boolean;
  volumeDb: number;
}

export async function GET(req: NextRequest) {
  const propertyId = req.nextUrl.searchParams.get('propertyId');
  const videoUrl = req.nextUrl.searchParams.get('videoUrl');
  const musicPublicId = req.nextUrl.searchParams.get('musicPublicId');
  const keepOriginalAudio = req.nextUrl.searchParams.get('keepOriginalAudio') === 'true';
  const volumeParam = req.nextUrl.searchParams.get('musicVolume');

  if (!propertyId || !videoUrl) {
    return NextResponse.json({ error: 'propertyId y videoUrl requeridos' }, { status: 400 });
  }

  return handlePublishReel(propertyId, videoUrl, {
    musicPublicId,
    keepOriginalAudio,
    volumeDb: volumeParam ? Number(volumeParam) : -20,
  });
}

export async function POST(req: NextRequest) {
  const { propertyId, videoUrl, musicPublicId, keepOriginalAudio, musicVolume } = await req.json();

  if (!propertyId || !videoUrl) {
    return NextResponse.json({ error: 'propertyId y videoUrl requeridos' }, { status: 400 });
  }

  return handlePublishReel(propertyId, videoUrl, {
    musicPublicId: musicPublicId || null,
    keepOriginalAudio: !!keepOriginalAudio,
    volumeDb: typeof musicVolume === 'number' ? musicVolume : -20,
  });
}

function buildReelCaption(
  property: any,
  agent: any,
  propertyLanguage: 'es' | 'en',
  currencySymbol: string
): string {
  const translations = {
    es: {
      sale: '🎯 VENTA',
      rent: '🎯 ALQUILER',
      waMessage: 'Hola, me interesa la propiedad: ',
      waDetails: '. Me gustaría recibir más información.',
      priceOnRequest: 'Precio a consultar',
      locationAvailable: 'Ubicación disponible',
    },
    en: {
      sale: '🎯 FOR SALE',
      rent: '🎯 FOR RENT',
      waMessage: 'Hello, I am interested in this property: ',
      waDetails: '. I would like to get more information.',
      priceOnRequest: 'Price upon request',
      locationAvailable: 'Location available',
    },
  };

  const t = translations[propertyLanguage];
  const operationType = property.listing_type === 'rent' ? t.rent : t.sale;

  const locationParts = [property.city, property.state].filter(Boolean);
  const displayLocation = locationParts.length > 0
    ? locationParts.join(', ')
    : property.address || t.locationAvailable;

  const displayPrice = property.price
    ? `${currencySymbol}${Number(property.price).toLocaleString()}`
    : t.priceOnRequest;

  const agentName = agent.full_name || agent.name || 'Agente inmobiliario';
  const agentPhone = agent.phone || '';
  const cleanPhone = agentPhone.replace(/\D/g, '');

  let waLink = '';
  if (cleanPhone) {
    const customMessage = `${t.waMessage}${property.title}${t.waDetails}`;
    waLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(customMessage)}`;
  }

  const isEn = propertyLanguage === 'en';
  const sanitizeTag = (str: string) => (str ? str.replace(/[^a-zA-Z0-9]/g, '') : '');
  const operationTag = property.listing_type === 'rent'
    ? (isEn ? '#ForRent' : '#Alquiler')
    : (isEn ? '#ForSale' : '#Venta');
  const cityTag = property.city ? `#${sanitizeTag(property.city)}` : '';
  const marketTag = isEn ? '#CostaRicaRealEstate' : '#BienesRaicesCR';

  const tags = [marketTag, operationTag, cityTag].filter(Boolean).join(' ');

  const message = `
${operationType}

🏡 ${property.title}

📍 ${displayLocation}
💰 ${displayPrice}

👤 ${agentName}
👉 ${waLink}

${tags}
  `.trim();

  return message;
}

function handlePublishReel(propertyId: string, videoUrl: string, music: MusicOptions) {
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  const sendEvent = async (data: any) => {
    try {
      await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
    } catch (err) {
      console.error('Error enviando evento SSE:', err);
    }
  };

  (async () => {
    let tempCloudinaryPublicId: string | null = null;

    try {
      const session = await getServerSession(authOptions);

      if (!session?.user?.email) {
        await sendEvent({ error: 'No autenticado', progress: 0 });
        await writer.close();
        return;
      }

      const userEmail = session.user.email;

      const { data: agentPlan } = await supabaseAdmin
        .from('agents')
        .select('plan, role, expires_at')
        .eq('email', userEmail)
        .single();

      const isProActivo =
        agentPlan?.role === 'admin' ||
        (agentPlan?.plan === 'pro' && !!agentPlan?.expires_at && new Date(agentPlan.expires_at) > new Date());

      if (!isProActivo) {
        await sendEvent({ error: '🔒 Esta función requiere un plan Pro activo.', progress: 0 });
        await writer.close();
        return;
      }

      await sendEvent({ message: 'Obteniendo datos...', progress: 10 });

      const { data: agent, error: agentError } = await supabaseAdmin
        .from('agents')
        .select('id, full_name, name, phone, postforme_account_id')
        .eq('email', userEmail)
        .single();

      if (agentError || !agent) {
        await sendEvent({ error: 'Agente no encontrado', progress: 0 });
        await writer.close();
        return;
      }

      if (!agent.postforme_account_id) {
        await sendEvent({ error: 'Facebook no conectado', progress: 0 });
        await writer.close();
        return;
      }

      const { data: property, error: propertyError } = await supabaseAdmin
        .from('properties')
        .select('id, title, description, price, city, state, address, agent_id, listing_type, language, currency_id, video_urls')
        .eq('id', propertyId)
        .single();

      if (propertyError || !property) {
        await sendEvent({ error: 'Propiedad no encontrada', progress: 0 });
        await writer.close();
        return;
      }

      const videoBelongsToProperty = (property.video_urls || []).includes(videoUrl);
      if (!videoBelongsToProperty) {
        await sendEvent({ error: 'El video no pertenece a esta propiedad', progress: 0 });
        await writer.close();
        return;
      }

      // ── Fusión con música (opcional) ──────────────────────────
      let finalVideoUrl = videoUrl;

      if (music.musicPublicId) {
        await sendEvent({ message: 'Subiendo video a Cloudinary...', progress: 30 });
        const uploaded = await uploadMuxVideoToCloudinary(videoUrl, propertyId);
        tempCloudinaryPublicId = uploaded.publicId;

        await sendEvent({ message: 'Fusionando video con música...', progress: 45 });
        finalVideoUrl = await buildReelWithMusic(
          uploaded.publicId,
          music.musicPublicId,
          uploaded.durationSeconds,
          {
            keepOriginalAudio: music.keepOriginalAudio,
            volumeDb: music.volumeDb,
          }
        );
      }

      await sendEvent({ message: 'Preparando publicación...', progress: 55 });

      let currencySymbol = '$';
      if (property.currency_id) {
        const { data: currency } = await supabaseAdmin
          .from('currencies')
          .select('symbol')
          .eq('id', property.currency_id)
          .single();
        if (currency) currencySymbol = currency.symbol;
      }

      const propertyLanguage = property.language || 'es';
      const caption = buildReelCaption(property, agent, propertyLanguage, currencySymbol);

      await sendEvent({ message: 'Publicando Reel en Facebook...', progress: 70 });

      const post = await publishReelViaPostForMe(
        agent.postforme_account_id,
        caption,
        finalVideoUrl
      );

      await sendEvent({ message: 'Guardando registro...', progress: 90 });

      const { error: insertError } = await supabaseAdmin.from('facebook_posts').insert({
        property_id: propertyId,
        agent_id: agent.id,
        facebook_post_id: post.id,
        type: 'reel',
        published_at: new Date().toISOString(),
      });

      if (insertError) {
        console.error('⚠️ Error guardando registro (no crítico):', insertError);
      }

      await sendEvent({
        message: '✅ ¡Reel publicado exitosamente!',
        progress: 100,
        success: true,
        postUrl: post.id ? `https://facebook.com/${post.id}` : null,
      });

    } catch (error: any) {
      console.error('💥 Error publicando Reel:', error);
      await sendEvent({ error: error.message || 'Error al publicar el Reel', progress: 0 });
    } finally {
      if (tempCloudinaryPublicId) {
        await deleteCloudinaryVideo(tempCloudinaryPublicId);
      }
      try {
        await writer.close();
      } catch (err) {
        // Ignorar error de cierre
      }
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