import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { supabaseAdmin } from '@/lib/supabase';

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

    // 🔍 PASO CRÍTICO 1: Recibir datos del frontend
    const propertyData = await req.json();
    
    console.log('🔍 DATOS RECIBIDOS DEL FRONTEND:');
    console.log('custom_fields_data:', JSON.stringify(propertyData.custom_fields_data));
    console.log('currency_id:', propertyData.currency_id);

    if (!propertyData.title || !propertyData.description) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: title y description' },
        { status: 400 }
      );
    }

    // Obtener agente
    const { data: agent, error: agentError } = await supabaseAdmin
      .from('agents')
      .select('id, credits, plan, properties_this_month, default_currency_id')
      .eq('email', session.user.email)
      .single();

    if (agentError || !agent) {
      return NextResponse.json(
        { error: 'Agente no encontrado' },
        { status: 404 }
      );
    }

    // Verificar límites según plan
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

    // Determinar divisa
    let currencyId = propertyData.currency_id;

    if (!currencyId) {
      if (agent.default_currency_id) {
        currencyId = agent.default_currency_id;
      } else {
        const { data: defaultCurrency } = await supabaseAdmin
          .from('currencies')
          .select('id')
          .eq('is_default', true)
          .single();
        
        if (defaultCurrency) {
          currencyId = defaultCurrency.id;
        }
      }
    }

    // Validar divisa
    if (currencyId) {
      const { data: currencyCheck } = await supabaseAdmin
        .from('currencies')
        .select('id, code')
        .eq('id', currencyId)
        .eq('active', true)
        .single();

      if (!currencyCheck) {
        currencyId = null;
      }
    }

    const slug = generateSlug(propertyData.title);

    // 🔍 PASO CRÍTICO 2: Preparar datos para INSERT
    const dataToInsert = {
      agent_id: agent.id,
      title: propertyData.title,
      description: propertyData.description,
      price: propertyData.price,
      currency_id: currencyId,
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
    };

    console.log('🔍 DATOS PREPARADOS PARA INSERT:');
    console.log('custom_fields_data:', JSON.stringify(dataToInsert.custom_fields_data));
    console.log('currency_id:', dataToInsert.currency_id);

    // 🚨 NUEVO: Verificar el objeto COMPLETO que se enviará
    console.log('🚨 dataToInsert COMPLETO:', JSON.stringify(dataToInsert, null, 2));

    // 🔍 PASO CRÍTICO 3: Ejecutar INSERT
    const { data: property, error: propertyError } = await supabaseAdmin
      .from('properties')
      .insert(dataToInsert)
      .select()
      .single();

    // 🚨 NUEVO: Ver exactamente qué devolvió
    console.log('🚨 property COMPLETO:', JSON.stringify(property, null, 2));
    console.log('🚨 propertyError:', propertyError);

    if (propertyError) {
      console.error('Error al crear propiedad:', propertyError);
      return NextResponse.json(
        { error: 'Error al crear la propiedad', details: propertyError.message },
        { status: 500 }
      );
    }

    // 🔍 PASO CRÍTICO 4: Verificar qué devolvió Supabase
    console.log('🔍 DATOS DEVUELTOS POR SUPABASE:');
    console.log('custom_fields_data:', JSON.stringify(property.custom_fields_data));
    console.log('currency_id:', property.currency_id);

    // Incrementar contador (si es Pro)
    if (agent.plan === 'pro') {
      await supabaseAdmin
        .from('agents')
        .update({ 
          properties_this_month: agent.properties_this_month + 1 
        })
        .eq('id', agent.id);
    }

    return NextResponse.json({
      success: true,
      propertyId: property.id,
      slug: property.slug,
      property: {
        id: property.id,
        slug: property.slug,
        title: property.title,
        price: property.price,
        currency_id: property.currency_id,
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