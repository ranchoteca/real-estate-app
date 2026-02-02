import { NextRequest, NextResponse } from 'next/server';
import { validateUploadToken } from '@/lib/validate-upload-token';

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json(
        { valid: false, error: 'Token no proporcionado' },
        { status: 400 }
      );
    }

    // Usar la función compartida que SÍ incrementa el contador
    const validation = await validateUploadToken(token);

    if (!validation.valid) {
      return NextResponse.json(
        { 
          valid: false, 
          error: validation.error || 'Token inválido' 
        },
        { status: 401 }
      );
    }

    // Obtener nombre del agente
    const { supabaseAdmin } = await import('@/lib/supabase');
    const { data: agent } = await supabaseAdmin
      .from('agents')
      .select('name')
      .eq('id', validation.agentId)
      .single();

    return NextResponse.json({
      valid: true,
      agentId: validation.agentId,
      agentName: agent?.name || 'Agente',
    });

  } catch (error: any) {
    console.error('Error validating token:', error);
    return NextResponse.json(
      { valid: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}