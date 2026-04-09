import * as UpChunk from '@mux/upchunk';

export async function uploadVideoToMux(
  file: Blob,
  onProgress?: (progress: number) => void
): Promise<string> {
  const response = await fetch('/api/mux/create-upload', {
    method: 'POST',
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || 'Failed to create Mux upload');
  }

  const { uploadUrl, uploadId } = await response.json();

  await new Promise<void>((resolve, reject) => {
    const upload = UpChunk.createUpload({
      endpoint: uploadUrl,
      file,
      chunkSize: 5120, // 💡 MAGIA: Pedacitos de 5MB ideales para celulares
      attempts: 5,     // 💡 MAGIA: Si falla el internet, intenta 5 veces antes de rendirse
      delayBeforeAttempt: 2, // Espera 2 segundos entre intentos fallidos
    });

    upload.on('progress', (detail) => {
      if (onProgress) onProgress(detail.detail);
    });

    upload.on('success', () => resolve());
    upload.on('error', (error) => {
      const detail = error.detail;
      const message = typeof detail === 'string' 
        ? detail 
        : detail?.message || JSON.stringify(detail) || 'Upload failed';
      reject(new Error(message));
    });
  });

  return uploadId;
}

export async function waitForPlaybackId(
  uploadId: string,
  maxAttempts = 40, // Subimos a 40 intentos (2 minutos) por si el video es un poco más largo
  intervalMs = 3000
): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch(`/api/mux/get-asset?uploadId=${uploadId}`);
    const data = await response.json();

    // 💡 MAGIA: Ahora exigimos que el status sea 'ready'
    if (data.assetStatus === 'ready' && data.playbackId) {
      console.log(`✅ Video procesado y 100% listo: ${data.playbackId}`);
      return data.playbackId;
    }

    if (data.assetStatus === 'errored') {
      throw new Error('Mux reportó un error crítico al procesar el video.');
    }

    console.log(`⏳ Optimizando video... intento ${attempt + 1} (Estado: ${data.assetStatus || 'uploading'})`);
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }

  throw new Error('Timeout: El video tardó demasiado en procesarse');
}