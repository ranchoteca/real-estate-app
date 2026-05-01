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
          watermark_size,
          agent_cards (
            profile_photo
          )
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

    // Verificar si la propiedad es visible según el plan del agente
    const rawAgentForPlan = Array.isArray(property.agent) ? property.agent[0] : property.agent;

    const { data: agentPlan } = await supabaseAdmin
      .from('agents')
      .select('plan, expires_at')
      .eq('id', property.agent_id)
      .single();

    const isProActivo =
      agentPlan?.plan === 'pro' &&
      !!agentPlan?.expires_at &&
      new Date(agentPlan.expires_at) > new Date();

    if (!isProActivo) {
      // Obtener las 5 propiedades más recientes del agente
      const { data: recentProps } = await supabaseAdmin
        .from('properties')
        .select('id')
        .eq('agent_id', property.agent_id)
        .order('created_at', { ascending: false })
        .limit(5);

      const recentIds = (recentProps || []).map(p => p.id);

      if (!recentIds.includes(property.id)) {
        return NextResponse.json(
          { error: 'Esta propiedad no está disponible' },
          { status: 404 }
        );
      }
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
    const rawAgent = Array.isArray(property.agent) ? property.agent[0] : property.agent;
    const agentCard = Array.isArray(rawAgent?.agent_cards) ? rawAgent.agent_cards[0] : rawAgent?.agent_cards;

    const formattedProperty = {
      ...property,
      agent: {
        ...rawAgent,
        card_profile_photo: agentCard?.profile_photo || null,
      },
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