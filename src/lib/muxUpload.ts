import * as UpChunk from '@mux/upchunk';

export async function uploadVideoToMux(
  file: Blob,
  onProgress?: (progress: number) => void
): Promise<string> {
  // 1. Obtener URL de upload desde tu API
  const response = await fetch('/api/mux/create-upload', {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error('Failed to create Mux upload');
  }

  const { uploadUrl, uploadId } = await response.json();

  // 2. Subir el archivo usando UpChunk
  return new Promise((resolve, reject) => {
    const upload = UpChunk.createUpload({
      endpoint: uploadUrl,
      file,
    });

    upload.on('progress', (detail) => {
      if (onProgress) {
        onProgress(detail.detail);
      }
    });

    upload.on('success', () => {
      resolve(uploadId);
    });

    upload.on('error', (error) => {
      reject(error.detail);
    });
  });
}