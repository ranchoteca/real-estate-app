import OpenAI from 'openai';
import { toFile } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Descarga el audio desde la URL temporal de Wasender y lo transcribe con Whisper.
// El parámetro lang se pasa directamente a Whisper para forzar el idioma correcto
// y evitar que detecte automáticamente un idioma incorrecto.
export async function transcribeAudioFromUrl(audioUrl: string, lang: 'es' | 'en' = 'es'): Promise<string> {
  // 1. Descargar el audio
  const response = await fetch(audioUrl);
  if (!response.ok) {
    throw new Error(`No se pudo descargar el audio: ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || 'audio/ogg';
  const ext = contentType.split('/')[1]?.split(';')[0] || 'ogg';
  const buffer = await response.arrayBuffer();

  // 2. Convertir a File compatible con Whisper
  const audioFile = await toFile(Buffer.from(buffer), `audio.${ext}`, {
    type: contentType,
  });

  // 3. Transcribir con Whisper usando el idioma del flujo
  const transcription = await openai.audio.transcriptions.create({
    file: audioFile,
    model: 'whisper-1',
    language: lang,
    response_format: 'text',
  });

  return transcription as unknown as string;
}