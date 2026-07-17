// ============================================================
// lib/cloudinary.ts
// ============================================================

import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Sube el video de Mux a Cloudinary (copia temporal, se borra después de publicar)
export async function uploadMuxVideoToCloudinary(muxUrl: string, propertyId: string) {
  const result = await cloudinary.uploader.upload(muxUrl, {
    resource_type: 'video',
    asset_folder: 'reels-temp', // tu cuenta usa Dynamic Folder Mode
    public_id: `${propertyId}-${Date.now()}`,
    overwrite: false,
  });

  return {
    publicId: result.public_id as string,
    durationSeconds: result.duration as number,
  };
}

interface BuildReelOptions {
  // true = el video ya tiene audio/narración del agente y se debe conservar,
  //        mezclando la música por debajo a bajo volumen.
  // false = el video no tiene audio útil, se reemplaza por completo con la música.
  keepOriginalAudio: boolean;
  // Volumen de la música en dB, típicamente negativo (ej. -35 muy suave, -10 fuerte)
  volumeDb: number;
}

// Fusiona el video ya subido con la pista de música elegida, recortada a la
// duración del video. Fuerza generación síncrona (eager) para que la URL
// devuelta ya esté lista para usarse, sin demoras cuando Meta la busque.
export async function buildReelWithMusic(
  videoPublicId: string,
  musicPublicId: string,
  videoDurationSeconds: number,
  options: BuildReelOptions
): Promise<string> {
  const transformation: Record<string, any>[] = [];

  // Solo quitamos el audio original si el agente indicó que no hay nada
  // que conservar (sin esto, Cloudinary mezcla ambos audios por defecto)
  if (!options.keepOriginalAudio) {
    transformation.push({ audio_codec: 'none' });
  }

  transformation.push({ overlay: `audio:${musicPublicId}` });
  transformation.push({
    end_offset: Math.round(videoDurationSeconds), // recorta la música a la duración del video
    effect: `volume:${options.volumeDb}`,          // controla qué tan fuerte suena la música
  });
  transformation.push({ flags: 'layer_apply' });

  const result = await cloudinary.uploader.explicit(videoPublicId, {
    type: 'upload',
    resource_type: 'video',
    eager: [transformation],
    eager_async: false, // esperamos a que termine antes de continuar
  });

  const eager = result.eager?.[0];
  if (!eager?.secure_url) {
    throw new Error('Cloudinary no devolvió la URL del video fusionado con música');
  }

  return eager.secure_url as string;
}

// Borra la copia temporal del video después de publicar (no borra la música,
// esa es permanente)
export async function deleteCloudinaryVideo(publicId: string) {
  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: 'video',
      invalidate: true,
    });
  } catch (err) {
    console.error('⚠️ Error borrando video temporal de Cloudinary (no crítico):', err);
  }
}