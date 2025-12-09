import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { data: agent, error: agentError } = await supabaseAdmin
      .from('agents')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agente no encontrado' }, { status: 404 });
    }

    const formData = await req.formData();
    const files = formData.getAll('photos') as File[];
    const propertySlug = formData.get('propertySlug') as string;

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No se proporcionaron fotos' }, { status: 400 });
    }

    if (!propertySlug) {
      return NextResponse.json({ error: 'propertySlug es requerido' }, { status: 400 });
    }

    if (files.length > 20) {
      return NextResponse.json({ error: 'Máximo 20 fotos permitidas' }, { status: 400 });
    }

    console.log(`📤 Subiendo ${files.length} fotos para ${propertySlug}...`);

    const uploadedUrls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      if (file.size > 5 * 1024 * 1024) {
        console.warn(`⚠️ Foto ${i + 1} muy grande, saltando...`);
        continue;
      }

      const fileExt = file.name.split('.').pop() || 'jpg';
      
      // ✅ USAR TIMESTAMP PARA NOMBRES ÚNICOS (evita sobreescritura)
      const timestamp = Date.now();
      const fileName = `${agent.id}/${propertySlug}/foto-${timestamp}-${i}.${fileExt}`;

      const arrayBuffer = await file.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);

      const { data, error } = await supabaseAdmin.storage
        .from('property-photos')
        .upload(fileName, buffer, {
          contentType: file.type || `image/${fileExt}`,
          cacheControl: '3600',
          upsert: false, // ← false porque ahora los nombres son únicos
        });

      if (error) {
        console.error(`❌ Error subiendo foto ${i + 1}:`, error);
        continue;
      }

      const { data: publicUrlData } = supabaseAdmin.storage
        .from('property-photos')
        .getPublicUrl(fileName);

      uploadedUrls.push(publicUrlData.publicUrl);
      console.log(`✅ Foto ${i + 1} subida: ${fileName}`);
    }

    if (uploadedUrls.length === 0) {
      return NextResponse.json({ error: 'No se pudo subir ninguna foto' }, { status: 500 });
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
      { error: 'Error al subir las fotos', details: error },
      { status: 500 }
    );
  }
}
