import { supabaseAdmin } from '@/lib/supabase';
import { applyWatermark } from './watermark';

interface AgentWatermarkConfig {
  watermark_logo?: string | null;
  watermark_position?: string | null;
  watermark_size?: string | null;
  watermark_image?: string | null;
  watermark_opacity?: number | null;
  watermark_scale?: number | null;
  use_corner_logo?: boolean | null;
  use_watermark?: boolean | null;
}

// Downloads a photo from a public URL (Wasender decrypted URL),
// applies the agent's watermark config, then uploads to Supabase Storage.
// Returns the permanent public URL.

export async function uploadPhotoFromUrl(
  agentId: string,
  propertySlug: string,
  photoUrl: string,
  index: number,
  watermarkConfig?: AgentWatermarkConfig
): Promise<string> {
  // 1. Download from Wasender temporary URL
  const response = await fetch(photoUrl);
  if (!response.ok) {
    throw new Error('No se pudo descargar la foto: ' + response.status);
  }

  const contentType = response.headers.get('content-type') || 'image/jpeg';
  const rawBuffer = Buffer.from(await response.arrayBuffer());

  // 2. Apply watermark if config provided (always use jpeg output after processing)
  let finalBuffer: Buffer;
  let finalContentType = contentType;

  if (watermarkConfig) {
    finalBuffer = await applyWatermark(rawBuffer, watermarkConfig);
    finalContentType = 'image/jpeg';
  } else {
    finalBuffer = rawBuffer;
  }

  // 3. Upload to Supabase Storage
  const ext = finalContentType.split('/')[1]?.split(';')[0] || 'jpg';
  const timestamp = Date.now();
  const fileName = agentId + '/' + propertySlug + '/foto-' + timestamp + '-' + index + '.' + ext;

  const { error } = await supabaseAdmin.storage
    .from('property-photos')
    .upload(fileName, finalBuffer, {
      contentType: finalContentType,
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    throw new Error('Error subiendo foto a Supabase: ' + error.message);
  }

  const { data: publicUrlData } = supabaseAdmin.storage
    .from('property-photos')
    .getPublicUrl(fileName);

  return publicUrlData.publicUrl;
}