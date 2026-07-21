import { enqueueForAgent } from '@/lib/flowia/send-queue';

const MAX_RETRIES = 3;

/**
 * Sends a WhatsApp message via Wasender with automatic 429 retry/backoff.
 * Use sendQueued instead of calling this directly — it serializes per agent
 * to avoid hitting rate limits when multiple webhooks fire simultaneously.
 */
export async function sendWhatsAppMessage(
  to: string,
  text: string,
  documentUrl?: string,
  fileName?: string
) {
  const payload: any = { to, text };
  if (documentUrl) {
    payload.documentUrl = documentUrl;
    if (fileName) payload.fileName = fileName;
  }

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch('https://www.wasenderapi.com/api/send-message', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.WASENDER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 429) {
        if (attempt === MAX_RETRIES) {
          throw new Error(`Error HTTP de Wasender: 429 (tras ${MAX_RETRIES} reintentos)`);
        }
        const retryAfterHeader = response.headers.get('Retry-After');
        const waitMs = retryAfterHeader
          ? parseInt(retryAfterHeader, 10) * 1000
          : 1500 * (attempt + 1);
        console.log(`⏳ 429 de Wasender. Reintentando en ${waitMs}ms (intento ${attempt + 1}/${MAX_RETRIES})`);
        await new Promise(r => setTimeout(r, waitMs));
        continue;
      }

      if (!response.ok) {
        throw new Error(`Error HTTP de Wasender: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (attempt === MAX_RETRIES) {
        console.error('Error enviando mensaje por Wasender:', error);
        throw error;
      }
    }
  }
}

/**
 * Queued version of sendWhatsAppMessage — always use this in the webhook.
 * Serializes sends per agent with a minimum gap to prevent 429 errors
 * when multiple webhooks arrive simultaneously (e.g. WhatsApp photo galleries).
 */
export async function sendQueued(
  agentId: string,
  to: string,
  text: string,
  documentUrl?: string,
  fileName?: string
): Promise<void> {
  await enqueueForAgent(agentId, () =>
    sendWhatsAppMessage(to, text, documentUrl, fileName).then(() => undefined)
  );
}

/**
 * Converts markdown bold (**text**) to WhatsApp bold (*text*).
 */
export function formatForWhatsApp(text: string): string {
  return text.replace(/\*\*(.*?)\*\*/g, '*$1*');
}