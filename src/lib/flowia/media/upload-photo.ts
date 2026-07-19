import { supabaseAdmin } from '@/lib/supabase';

// Descarga una foto desde una URL pública (ej. Wasender decrypted URL)
// y la sube a Supabase Storage. Devuelve la URL pública permanente.

export async function uploadPhotoFromUrl(
  agentId: string,
  propertySlug: string,
  photoUrl: string,
  index: number
): Promise<string> {
  // 1. Descargar el archivo desde la URL temporal de Wasender
  const response = await fetch(photoUrl);
  if (!response.ok) {
    throw new Error(`No se pudo descargar la foto: ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || 'image/jpeg';
  const ext = contentType.split('/')[1]?.split(';')[0] || 'jpg';
  const buffer = new Uint8Array(await response.arrayBuffer());

  // 2. Subir a Supabase Storage con nombre único
  const timestamp = Date.now();
  const fileName = `${agentId}/${propertySlug}/foto-${timestamp}-${index}.${ext}`;

  const { error } = await supabaseAdmin.storage
    .from('property-photos')
    .upload(fileName, buffer, {
      contentType,
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    throw new Error(`Error subiendo foto a Supabase: ${error.message}`);
  }

  // 3. Obtener URL pública
  const { data: publicUrlData } = supabaseAdmin.storage
    .from('property-photos')
    .getPublicUrl(fileName);

  return publicUrlData.publicUrl;
}