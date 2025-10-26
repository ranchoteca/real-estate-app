import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('logo') as File;

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó archivo' }, { status: 400 });
    }

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Solo se permiten imágenes' }, { status: 400 });
    }

    // Validar tamaño (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'Imagen muy grande (máx 2MB)' }, { status: 400 });
    }

    // Obtener agente
    const { data: agent } = await supabaseAdmin
      .from('agents')
      .select('id, watermark_logo')
      .eq('email', session.user.email)
      .single();

    if (!agent) {
      return NextResponse.json({ error: 'Agente no encontrado' }, { status: 404 });
    }

    // Eliminar logo anterior si existe
    if (agent.watermark_logo) {
      const oldPath = agent.watermark_logo.split('/').pop();
      if (oldPath) {
        await supabaseAdmin.storage
          .from('watermarks')
          .remove([`${agent.id}/${oldPath}`]);
      }
    }

    // Subir nuevo logo
    const fileName = `logo_${Date.now()}.${file.type.split('/')[1]}`;
    const filePath = `${agent.id}/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('watermarks')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error('Error uploading:', uploadError);
      return NextResponse.json({ error: 'Error al subir logo' }, { status: 500 });
    }

    // Obtener URL pública
    const { data: publicUrlData } = supabaseAdmin.storage
      .from('watermarks')
      .getPublicUrl(filePath);

    const logoUrl = publicUrlData.publicUrl;

    // Actualizar en BD
    await supabaseAdmin
      .from('agents')
      .update({ watermark_logo: logoUrl })
      .eq('id', agent.id);

    return NextResponse.json({ success: true, logoUrl });
  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}