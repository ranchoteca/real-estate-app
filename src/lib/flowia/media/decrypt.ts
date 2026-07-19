// Desencripta media recibida en el webhook usando el endpoint de Wasender.
// Devuelve una publicUrl válida por 1 hora.

interface DecryptResult {
  publicUrl: string;
}

export async function decryptWasenderMedia(
  messageId: string,
  messageObject: Record<string, any>
): Promise<DecryptResult> {
  const payload = {
    data: {
      messages: {
        key: { id: messageId },
        message: messageObject,
      },
    },
  };

  const response = await fetch('https://www.wasenderapi.com/api/decrypt-media', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.WASENDER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Wasender decrypt error: ${response.status}`);
  }

  const data = await response.json();

  if (!data.success || !data.publicUrl) {
    throw new Error('Wasender decrypt: respuesta inesperada');
  }

  return { publicUrl: data.publicUrl };
}

// ─── Helpers para identificar el tipo de media en el payload ────────────────

export type MediaType = 'image' | 'audio' | 'video' | 'document';

export interface MediaInfo {
  type: MediaType;
  messageObject: Record<string, any>; // objeto message completo para el decrypt
  mimetype: string;
}

export function extractMediaInfo(message: Record<string, any>): MediaInfo | null {
  if (message?.imageMessage) {
    return {
      type: 'image',
      messageObject: { imageMessage: message.imageMessage },
      mimetype: message.imageMessage.mimetype || 'image/jpeg',
    };
  }
  if (message?.audioMessage) {
    return {
      type: 'audio',
      messageObject: { audioMessage: message.audioMessage },
      mimetype: message.audioMessage.mimetype || 'audio/ogg',
    };
  }
  if (message?.videoMessage) {
    return {
      type: 'video',
      messageObject: { videoMessage: message.videoMessage },
      mimetype: message.videoMessage.mimetype || 'video/mp4',
    };
  }
  if (message?.documentMessage) {
    return {
      type: 'document',
      messageObject: { documentMessage: message.documentMessage },
      mimetype: message.documentMessage.mimetype || 'application/octet-stream',
    };
  }
  return null;
}