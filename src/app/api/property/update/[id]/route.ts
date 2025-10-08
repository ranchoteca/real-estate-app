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
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { id } = await params;
    const updates = await req.json();

    const { data: agent } = await supabaseAdmin
      .from('agents')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (!agent) {
      return NextResponse.json({ error: 'Agente no encontrado' }, { status: 404 });
    }

    // Verificar propiedad pertenece al agente
    const { data: property } = await supabaseAdmin
      .from('properties')
      .select('id')
      .eq('id', id)
      .eq('agent_id', agent.id)
      .single();

    if (!property) {
      return NextResponse.json({ error: 'No tienes permiso' }, { status: 403 });
    }

    // Actualizar
    const { error } = await supabaseAdmin
      .from('properties')
      .update({
        title: updates.title,
        description: updates.description,
        price: updates.price,
        address: updates.address,
        city: updates.city,
        state: updates.state,
        zip_code: updates.zip_code,
        bedrooms: updates.bedrooms,
        bathrooms: updates.bathrooms,
        sqft: updates.sqft,
        property_type: updates.property_type,
        status: updates.status,
      })
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 });
    }

    console.log('✅ Propiedad actualizada:', id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}