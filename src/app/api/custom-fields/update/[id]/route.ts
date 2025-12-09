import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const { field_name, field_name_en, field_type, placeholder, icon } = body;

    // Validaciones
    if (!field_name || !field_type) {
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

    // Verificar que el campo pertenece al agente
    const { data: field, error: fieldError } = await supabaseAdmin
      .from('custom_fields')
      .select('*')
      .eq('id', id)
      .eq('agent_id', agent.id)
      .single();

    if (fieldError || !field) {
      return NextResponse.json(
        { error: 'Campo no encontrado o no tienes permiso' },
        { status: 404 }
      );
    }

    // Verificar duplicados (excepto el mismo campo)
    const { data: duplicateField } = await supabaseAdmin
      .from('custom_fields')
      .select('id')
      .eq('agent_id', agent.id)
      .eq('property_type', field.property_type)
      .eq('listing_type', field.listing_type)
      .eq('field_name', field_name.trim())
      .neq('id', id)
      .single();

    if (duplicateField) {
      return NextResponse.json(
        { error: 'Ya existe un campo con ese nombre para esta combinación' },
        { status: 400 }
      );
    }

    // Actualizar campo
    // Actualizar campo
    const { data: updatedField, error: updateError } = await supabaseAdmin
      .from('custom_fields')
      .update({
        field_name: field_name.trim(),
        field_name_en: field_name_en?.trim() || field_name.trim(),
        field_type,
        placeholder: placeholder?.trim() || `Ej: ${field_name}`,
        icon: icon || '🏷️',
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error al actualizar campo:', updateError);
      return NextResponse.json(
        { error: 'Error al actualizar el campo' },
        { status: 500 }
      );
    }

    console.log('✅ Campo personalizado actualizado:', id);

    return NextResponse.json({
      success: true,
      field: updatedField,
    });

  } catch (error: any) {
    console.error('Error en update custom field:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno' },
      { status: 500 }
    );
  }
}