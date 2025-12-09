import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { supabaseAdmin } from '@/lib/supabase';

const MAX_FIELDS_PER_COMBO = 5;

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { property_type, listing_type, field_name, field_name_en, field_type, placeholder, icon } = body;

    // Validaciones
    if (!property_type || !listing_type || !field_name || !field_type) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    if (field_name.length > 30) {
      return NextResponse.json(
        { error: 'El nombre del campo no puede tener más de 30 caracteres' },
        { status: 400 }
      );
    }

    if (!['text', 'number'].includes(field_type)) {
      return NextResponse.json(
        { error: 'Tipo de campo inválido' },
        { status: 400 }
      );
    }

    const validPropertyTypes = ['house', 'condo', 'apartment', 'land', 'commercial'];
    const validListingTypes = ['sale', 'rent'];

    if (!validPropertyTypes.includes(property_type) || !validListingTypes.includes(listing_type)) {
      return NextResponse.json(
        { error: 'Tipo de propiedad o listing inválido' },
        { status: 400 }
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

    // Verificar límite de campos por combinación
    const { count } = await supabaseAdmin
      .from('custom_fields')
      .select('*', { count: 'exact', head: true })
      .eq('agent_id', agent.id)
      .eq('property_type', property_type)
      .eq('listing_type', listing_type);

    if (count && count >= MAX_FIELDS_PER_COMBO) {
      return NextResponse.json(
        { error: `Máximo ${MAX_FIELDS_PER_COMBO} campos por combinación` },
        { status: 400 }
      );
    }

    // Verificar que no exista un campo con el mismo nombre para esta combinación
    const { data: existingField } = await supabaseAdmin
      .from('custom_fields')
      .select('id')
      .eq('agent_id', agent.id)
      .eq('property_type', property_type)
      .eq('listing_type', listing_type)
      .eq('field_name', field_name.trim())
      .single();

    if (existingField) {
      return NextResponse.json(
        { error: 'Ya existe un campo con ese nombre para esta combinación' },
        { status: 400 }
      );
    }

    // Crear campo personalizado
    const { data: newField, error: createError } = await supabaseAdmin
      .from('custom_fields')
      .insert({
        agent_id: agent.id,
        field_key: `cf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        property_type,
        listing_type,
        field_name: field_name.trim(),
        field_name_en: field_name_en?.trim() || field_name.trim(),
        field_type,
        placeholder: placeholder?.trim() || `Ej: ${field_name}`,
        icon: icon || '🏷️', // AGREGADO: Guardar el icono
        display_order: count || 0,
      })
      .select()
      .single();

    if (createError) {
      console.error('Error al crear campo:', createError);
      return NextResponse.json(
        { error: 'Error al crear el campo personalizado' },
        { status: 500 }
      );
    }

    console.log('✅ Campo personalizado creado:', newField.id);

    return NextResponse.json({
      success: true,
      field: newField,
    });

  } catch (error: any) {
    console.error('Error en create custom field:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno' },
      { status: 500 }
    );
  }
}