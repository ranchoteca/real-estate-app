import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { supabaseAdmin } from '@/lib/supabase';

// Función para generar slug único
function generateSlug(title: string): string {
  const baseSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  
  const timestamp = Date.now().toString(36);
  return `${baseSlug}-${timestamp}`;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const propertyData = await req.json();

    if (!propertyData.title || !propertyData.description) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: title y description' },
        { status: 400 }
      );
    }

    console.log('💾 Creando propiedad en Supabase...');

    // 1. Obtener el agente actual
    const { data: agent, error: agentError } = await supabaseAdmin
      .from('agents')
      .select('id, credits, plan, properties_this_month')
      .eq('email', session.user.email)
      .single();

    if (agentError || !agent) {
      console.error('Error al obtener agente:', agentError);
      return NextResponse.json(
        { error: 'Agente no encontrado' },
        { status: 404 }
      );
    }

    // 2. Verificar límites según plan
    if (agent.plan === 'free') {
      const { count } = await supabaseAdmin
        .from('properties')
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', agent.id);

      if (count && count >= 20) {
        return NextResponse.json(
          { error: 'Has alcanzado el límite de 20 propiedades. Actualiza a Pro para crear más.' },
          { status: 403 }
        );
      }
    } else if (agent.plan === 'pro') {
      if (agent.properties_this_month >= 30) {
        return NextResponse.json(
          { error: 'Has alcanzado el límite de 30 propiedades este mes.' },
          { status: 403 }
        );
      }
    }

    // 3. Generar slug único
    const slug = generateSlug(propertyData.title);

    // 4. Crear propiedad (CON plus_code)
    const { data: property, error: propertyError } = await supabaseAdmin
      .from('properties')
      .insert({
        agent_id: agent.id,
        title: propertyData.title,
        description: propertyData.description,
        price: propertyData.price,
        address: propertyData.address,
        city: propertyData.city,
        state: propertyData.state,
        zip_code: propertyData.zip_code,
        property_type: propertyData.property_type || 'house',
        listing_type: propertyData.listing_type || 'sale',
        photos: propertyData.photos || [],
        audio_url: propertyData.audio_url || null,
        status: 'active',
        slug,
        latitude: propertyData.latitude || null,
        longitude: propertyData.longitude || null,
        plus_code: propertyData.plus_code || null,
        show_map: propertyData.show_map !== undefined ? propertyData.show_map : true,
        custom_fields_data: propertyData.custom_fields_data || {},
      })
      .select()
      .single();

    if (propertyError) {
      console.error('Error al crear propiedad:', propertyError);
      return NextResponse.json(
        { error: 'Error al crear la propiedad', details: propertyError.message },
        { status: 500 }
      );
    }

    // 5. Incrementar contador de propiedades del mes (si es Pro)
    if (agent.plan === 'pro') {
      await supabaseAdmin
        .from('agents')
        .update({ 
          properties_this_month: agent.properties_this_month + 1 
        })
        .eq('id', agent.id);
    }

    console.log('✅ Propiedad creada exitosamente');
    console.log('ID:', property.id);
    console.log('Slug:', property.slug);
    console.log('Ubicación:', property.latitude, property.longitude);
    console.log('Plus Code:', property.plus_code);
    console.log('Mostrar mapa:', property.show_map);
    console.log('Campos personalizados:', Object.keys(property.custom_fields_data || {}).length);

    return NextResponse.json({
      success: true,
      propertyId: property.slug,
      property: {
        id: property.id,
        slug: property.slug,
        title: property.title,
        price: property.price,
      },
    });

  } catch (error: any) {
    console.error('❌ Error al crear propiedad:', error);
    
    return NextResponse.json(
      { 
        error: 'Error al crear la propiedad',
        details: error.message 
      },
      { status: 500 }
    );
  }
}