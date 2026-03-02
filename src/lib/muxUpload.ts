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
  maxAttempts = 30,
  intervalMs = 3000
): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch(`/api/mux/get-asset?uploadId=${uploadId}`);
    const data = await response.json();

    if (data.playbackId) {
      console.log(`✅ PlaybackId listo: ${data.playbackId}`);
      return data.playbackId;
    }

    console.log(`⏳ Esperando playbackId... intento ${attempt + 1}`);
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }

    throw new Error('Timeout: playbackId not ready');
}