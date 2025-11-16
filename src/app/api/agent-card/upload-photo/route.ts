import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string; // 'profile' o 'cover'

    if (!file) {
      return NextResponse.json(
        { error: 'No se proporcionó archivo' },
        { status: 400 }
      );
    }

    if (type !== 'profile' && type !== 'cover') {
      return NextResponse.json(
        { error: 'Tipo inválido. Debe ser "profile" o "cover"' },
        { status: 400 }
      );
    }

    // Validar tipo de archivo
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Solo se permiten imágenes JPG, PNG o WebP' },
        { status: 400 }
      );
    }

    // Validar tamaño (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'La imagen no puede exceder 5MB' },
        { status: 400 }
      );
    }

    // Obtener agente
    const { data: agent } = await supabaseAdmin
      .from('agents')
      .select('id, username')
      .eq('email', session.user.email)
      .single();

    if (!agent) {
      return NextResponse.json(
        { error: 'Agente no encontrado' },
        { status: 404 }
      );
    }

    // Nombre del archivo (siempre el mismo para sobreescribir)
    const fileName = type === 'profile' ? 'profile.jpg' : 'cover.jpg';
    const filePath = `${agent.username}/${fileName}`;

    // Convertir File a ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Eliminar archivo anterior si existe
    await supabaseAdmin.storage
      .from('agent-cards')
      .remove([filePath]);

    // Subir nuevo archivo
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('agent-cards')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
        cacheControl: '3600'
      });

    if (uploadError) throw uploadError;

    // Obtener URL pública
    const { data: urlData } = supabaseAdmin.storage
      .from('agent-cards')
      .getPublicUrl(filePath);

    // Agregar timestamp para evitar caché
    const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      type
    });

  } catch (error: any) {
    console.error('Error uploading photo:', error);
    return NextResponse.json(
      { error: error.message || 'Error al subir imagen' },
      { status: 500 }
    );
  }
}