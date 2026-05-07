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
      chunkSize: 5120,
      attempts: 5,
      delayBeforeAttempt: 2,
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

// Ahora retorna tanto playbackId como assetId
export async function waitForPlaybackId(
  uploadId: string,
  maxAttempts = 40,
  intervalMs = 3000
): Promise<{ playbackId: string; assetId: string }> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch(`/api/mux/get-asset?uploadId=${uploadId}`);
    const data = await response.json();

    if (data.assetStatus === 'ready' && data.playbackId && data.assetId) {
      console.log(`✅ Video listo: playbackId=${data.playbackId} assetId=${data.assetId}`);
      return { playbackId: data.playbackId, assetId: data.assetId };
    }

    if (data.assetStatus === 'errored') {
      throw new Error('Mux reportó un error crítico al procesar el video.');
    }

    console.log(`⏳ Procesando... intento ${attempt + 1} (Estado: ${data.assetStatus || 'uploading'})`);
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }

  throw new Error('Timeout: El video tardó demasiado en procesarse');
}