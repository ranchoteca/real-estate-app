// app/api/property/list/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Obtener el agente actual
    const { data: agent, error: agentError } = await supabaseAdmin
      .from('agents')
      .select('id, plan, expires_at')
      .eq('email', session.user.email)
      .single();

    if (agentError || !agent) {
      return NextResponse.json(
        { error: 'Agente no encontrado' },
        { status: 404 }
      );
    }

    // Obtener propiedades del agente
    const { data: properties, error: propertiesError } = await supabaseAdmin
      .from('properties')
      .select('id, title, slug, price, currency_id, city, state, property_type, photos, status, views, created_at, listing_type, language, video_urls')
      .eq('agent_id', agent.id)
      .order('created_at', { ascending: false });

    if (propertiesError) {
      console.error('Error al obtener propiedades:', propertiesError);
      return NextResponse.json(
        { error: 'Error al cargar propiedades' },
        { status: 500 }
      );
    }

    // Obtener la última publicación en Facebook por propiedad
    const propertyIds = (properties || []).map(p => p.id);
    let lastFacebookPost: Record<string, string> = {};

    if (propertyIds.length > 0) {
      const { data: fbPosts } = await supabaseAdmin
        .from('facebook_posts')
        .select('property_id, published_at')
        .eq('agent_id', agent.id)
        .in('property_id', propertyIds)
        .order('published_at', { ascending: false });

      // Para cada property_id quedarnos solo con el más reciente
      (fbPosts || []).forEach(post => {
        if (post.property_id && !lastFacebookPost[post.property_id]) {
          lastFacebookPost[post.property_id] = post.published_at;
        }
      });
    }

    const optimizedProperties = (properties || []).map(p => ({
      ...p,
      photos: p.photos ? [p.photos[0]] : [],
      last_facebook_published_at: lastFacebookPost[p.id] || null,
    }));

    const isProActivo =
      agent.plan === 'pro' &&
      !!agent.expires_at &&
      new Date(agent.expires_at) > new Date();

    // Si es Free, mostrar solo las 5 más recientes
    const visibleProperties = isProActivo
      ? optimizedProperties
      : optimizedProperties.slice(0, 5);

    return NextResponse.json({
      success: true,
      properties: visibleProperties,
    });

  } catch (error) {
    console.error('❌ Error al listar propiedades:', error);
    
    return NextResponse.json(
      { 
        error: 'Error al cargar propiedades',
        details: error 
      },
      { status: 500 }
    );
  }
}