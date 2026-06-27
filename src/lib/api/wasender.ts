// lib/api/wasender.ts

export async function sendWhatsAppMessage(
  to: string, 
  text: string, 
  documentUrl?: string, 
  fileName?: string
) {
  try {
    const payload: any = { 
      to, 
      text 
    };

    if (documentUrl) {
      payload.documentUrl = documentUrl;
      if (fileName) {
        payload.fileName = fileName;
      }
    }

    const response = await fetch("https://www.wasenderapi.com/api/send-message", {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WASENDER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Error HTTP de Wasender: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error enviando mensaje por Wasender:', error);
    throw error;
  }
}

export function formatForWhatsApp(text: string): string {
  return text.replace(/\*\*(.*?)\*\*/g, '*$1*');
}