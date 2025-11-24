// app/api/property/[slug]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json(
        { error: 'Slug no proporcionado' },
        { status: 400 }
      );
    }

    console.log('🔍 Buscando propiedad:', slug);

    // Obtener la propiedad con datos del agente (el * incluye currency_id)
    const { data: property, error: propertyError } = await supabaseAdmin
      .from('properties')
      .select(`
        *,
        agent:agents (
          name,
          full_name,
          phone,
          email,
          brokerage,
          profile_photo,
          username,
          watermark_logo,
          watermark_position,
          watermark_size
        )
      `)
      .eq('slug', slug)
      .single();

    if (propertyError || !property) {
      console.error('❌ Propiedad no encontrada:', propertyError);
      return NextResponse.json(
        { error: 'Propiedad no encontrada' },
        { status: 404 }
      );
    }

    // Incrementar contador de vistas
    const { error: updateError } = await supabaseAdmin
      .from('properties')
      .update({ views: property.views + 1 })
      .eq('id', property.id);

    if (updateError) {
      console.error('⚠️ Error al actualizar vistas:', updateError);
    }

    console.log('✅ Propiedad encontrada:', property.title);
    console.log('💰 Divisa:', property.currency_id);

    // Formatear respuesta
    const formattedProperty = {
      ...property,
      agent: Array.isArray(property.agent) ? property.agent[0] : property.agent,
      views: property.views + 1,
    };

    return NextResponse.json({
      success: true,
      property: formattedProperty,
    });

  } catch (error) {
    console.error('❌ Error al obtener propiedad:', error);
    
    return NextResponse.json(
      { 
        error: 'Error al cargar la propiedad',
        details: error
      },
      { status: 500 }
    );
  }
}