import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    // Verificar autenticación: Sesión O Token
    const session = await getServerSession();
    const uploadToken = req.headers.get('X-Upload-Token');

    // Si no hay sesión, verificar token
    if (!session && !uploadToken) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Si hay token pero no sesión, validarlo
    if (uploadToken && !session) {
      const { data: tokenData, error: tokenError } = await supabase
        .from('upload_tokens')
        .select('id, agent_id, expires_at, is_active')
        .eq('token', uploadToken)
        .single();

      if (tokenError || !tokenData) {
        return NextResponse.json(
          { error: 'Token inválido' },
          { status: 401 }
        );
      }

      // Verificar si el token está activo
      if (!tokenData.is_active) {
        return NextResponse.json(
          { error: 'Token desactivado' },
          { status: 401 }
        );
      }

      // Verificar si el token ha expirado
      if (new Date(tokenData.expires_at) < new Date()) {
        return NextResponse.json(
          { error: 'Token expirado' },
          { status: 401 }
        );
      }

      console.log('✅ Token validado correctamente para agente:', tokenData.agent_id);
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

  } catch (error) {
    console.error('❌ Error en transcripción:', error);
    
    return NextResponse.json(
      { 
        error: 'Error al transcribir el audio',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}