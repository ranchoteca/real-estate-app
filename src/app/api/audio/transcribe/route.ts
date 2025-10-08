import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Obtener el archivo de audio del FormData
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No se proporcionó archivo de audio' },
        { status: 400 }
      );
    }

    // Validar tamaño (max 25MB para Whisper)
    if (audioFile.size > 25 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'El archivo es muy grande (máx 25MB)' },
        { status: 400 }
      );
    }

    console.log('📤 Enviando audio a OpenAI Whisper...');
    console.log('Tamaño del archivo:', (audioFile.size / 1024).toFixed(2), 'KB');

    // Transcribir con Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'es', // Español (cambia a 'en' si necesitas inglés)
      response_format: 'text',
    });

    console.log('✅ Transcripción completada');
    console.log('Longitud:', transcription.length, 'caracteres');

    return NextResponse.json({
      success: true,
      transcription,
    });

  } catch (error: any) {
    console.error('❌ Error en transcripción:', error);
    
    return NextResponse.json(
      { 
        error: 'Error al transcribir el audio',
        details: error.message 
      },
      { status: 500 }
    );
  }
}