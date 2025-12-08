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

    const body = await req.json();
    const {
      display_name,
      brokerage,
      bio,
      display_name_en,
      brokerage_en,
      bio_en,
      facebook_url,
      instagram_url,
      profile_photo,
      cover_photo
    } = body;

    // Validaciones
    if (!display_name || display_name.trim().length === 0) {
      return NextResponse.json(
        { error: 'El nombre es requerido' },
        { status: 400 }
      );
    }

    if (bio && bio.length > 500) {
      return NextResponse.json(
        { error: 'La biografía no puede exceder 500 caracteres' },
        { status: 400 }
      );
    }

    if (bio_en && bio_en.length > 500) {
      return NextResponse.json(
        { error: 'La biografía en inglés no puede exceder 500 caracteres' },
        { status: 400 }
      );
    }

    // Obtener agente
    const { data: agent } = await supabaseAdmin
      .from('agents')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (!agent) {
      return NextResponse.json(
        { error: 'Agente no encontrado' },
        { status: 404 }
      );
    }

    // Verificar si ya existe una tarjeta
    const { data: existingCard } = await supabaseAdmin
      .from('agent_cards')
      .select('id')
      .eq('agent_id', agent.id)
      .single();

    const cardData = {
      agent_id: agent.id,
      display_name: display_name.trim(),
      brokerage: brokerage?.trim() || null,
      bio: bio?.trim() || null,
      display_name_en: display_name_en?.trim() || null,
      brokerage_en: brokerage_en?.trim() || null,
      bio_en: bio_en?.trim() || null,
      facebook_url: facebook_url?.trim() || null,
      instagram_url: instagram_url?.trim() || null,
      profile_photo: profile_photo || null,
      cover_photo: cover_photo || null
    };

    let result;

    if (existingCard) {
      // Actualizar
      const { data, error } = await supabaseAdmin
        .from('agent_cards')
        .update(cardData)
        .eq('agent_id', agent.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Crear
      const { data, error } = await supabaseAdmin
        .from('agent_cards')
        .insert(cardData)
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    return NextResponse.json({
      success: true,
      card: result
    });

  } catch (error: any) {
    console.error('Error updating agent card:', error);
    return NextResponse.json(
      { error: error.message || 'Error al actualizar tarjeta' },
      { status: 500 }
    );
  }
}