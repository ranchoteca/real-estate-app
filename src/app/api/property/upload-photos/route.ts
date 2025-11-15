import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Obtener agente
    const { data: agent, error: agentError } = await supabaseAdmin
      .from('agents')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (agentError || !agent) {
      return NextResponse.json(
        { error: 'Agente no encontrado' },
        { status: 404 }
      );
    }

    // Obtener los archivos del FormData
    const formData = await req.formData();
    const files = formData.getAll('photos') as File[];
    const propertySlug = formData.get('propertySlug') as string; // ← NUEVO

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No se proporcionaron fotos' },
        { status: 400 }
      );
    }

    if (!propertySlug) {
      return NextResponse.json(
        { error: 'propertySlug es requerido' },
        { status: 400 }
      );
    }

    if (files.length > 20) {
      return NextResponse.json(
        { error: 'Máximo 20 fotos permitidas' },
        { status: 400 }
      );
    }

    console.log(`📤 Subiendo ${files.length} fotos para ${propertySlug}...`);

    const uploadedUrls: string[] = [];

    // Subir cada foto
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Validar tamaño (5MB)
      if (file.size > 5 * 1024 * 1024) {
        console.warn(`⚠️ Foto ${i + 1} muy grande, saltando...`);
        continue;
      }

      // Obtener extensión
      const fileExt = file.name.split('.').pop() || 'jpg';
      
      // ✅ NUEVA ESTRUCTURA: agent-id/property-slug/foto-N.ext
      const fileName = `${agent.id}/${propertySlug}/foto-${i + 1}.${fileExt}`;

      // Convertir File a ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);

      // Subir a Supabase Storage
      const { data, error } = await supabaseAdmin.storage
        .from('property-photos')
        .upload(fileName, buffer, {
          contentType: file.type || `image/${fileExt}`,
          cacheControl: '3600',
          upsert: true, // ← Cambiar a true para permitir resubir
        });

      if (error) {
        console.error(`❌ Error subiendo foto ${i + 1}:`, error);
        continue;
      }

      // Obtener URL pública
      const { data: publicUrlData } = supabaseAdmin.storage
        .from('property-photos')
        .getPublicUrl(fileName);

      uploadedUrls.push(publicUrlData.publicUrl);
      console.log(`✅ Foto ${i + 1} subida: ${fileName}`);
    }

    if (uploadedUrls.length === 0) {
      return NextResponse.json(
        { error: 'No se pudo subir ninguna foto' },
        { status: 500 }
      );
    }

    console.log(`✅ ${uploadedUrls.length} fotos subidas exitosamente`);

    return NextResponse.json({
      success: true,
      urls: uploadedUrls,
      count: uploadedUrls.length,
    });

  } catch (error) {
    console.error('❌ Error al subir fotos:', error);
    
    return NextResponse.json(
      { 
        error: 'Error al subir las fotos',
        details: error 
      },
      { status: 500 }
    );
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
};