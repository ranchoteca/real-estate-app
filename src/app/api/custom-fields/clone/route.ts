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
    const { field_id, target_property_type, target_listing_type } = body;

    // Validaciones
    if (!field_id || !target_property_type || !target_listing_type) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    const validPropertyTypes = ['house', 'condo', 'apartment', 'land', 'commercial'];
    const validListingTypes = ['sale', 'rent'];

    if (!validPropertyTypes.includes(target_property_type) || !validListingTypes.includes(target_listing_type)) {
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

    // Obtener campo original
    const { data: originalField, error: fieldError } = await supabaseAdmin
      .from('custom_fields')
      .select('*')
      .eq('id', field_id)
      .eq('agent_id', agent.id)
      .single();

    if (fieldError || !originalField) {
      return NextResponse.json(
        { error: 'Campo no encontrado o no tienes permiso' },
        { status: 404 }
      );
    }

    // Verificar límite de campos en destino
    const { count } = await supabaseAdmin
      .from('custom_fields')
      .select('*', { count: 'exact', head: true })
      .eq('agent_id', agent.id)
      .eq('property_type', target_property_type)
      .eq('listing_type', target_listing_type);

    if (count && count >= MAX_FIELDS_PER_COMBO) {
      return NextResponse.json(
        { error: `Máximo ${MAX_FIELDS_PER_COMBO} campos por combinación en el destino` },
        { status: 400 }
      );
    }

    // Verificar si ya existe un campo con el mismo nombre en el destino
    const { data: existingField } = await supabaseAdmin
      .from('custom_fields')
      .select('id')
      .eq('agent_id', agent.id)
      .eq('property_type', target_property_type)
      .eq('listing_type', target_listing_type)
      .eq('field_name', originalField.field_name)
      .single();

    if (existingField) {
      return NextResponse.json(
        { error: 'Ya existe un campo con ese nombre en la combinación destino' },
        { status: 400 }
      );
    }

    // ✅ CLAVE: Generar un field_key único para el campo clonado
    const uniqueFieldKey = `cf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Clonar campo
    const { data: clonedField, error: cloneError } = await supabaseAdmin
      .from('custom_fields')
      .insert({
        agent_id: agent.id,
        field_key: uniqueFieldKey, // ✅ AGREGADO: Campo requerido
        property_type: target_property_type,
        listing_type: target_listing_type,
        field_name: originalField.field_name,
        field_type: originalField.field_type,
        placeholder: originalField.placeholder,
        icon: originalField.icon,
        display_order: count || 0,
      })
      .select()
      .single();

    if (cloneError) {
      console.error('Error al clonar campo:', cloneError);
      return NextResponse.json(
        { error: 'Error al clonar el campo' },
        { status: 500 }
      );
    }

    console.log('✅ Campo clonado:', clonedField.id);

    return NextResponse.json({
      success: true,
      field: clonedField,
      message: 'Campo clonado exitosamente',
    });

  } catch (error: any) {
    console.error('Error en clone custom field:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno' },
      { status: 500 }
    );
  }
}