import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
    const uploadToken = req.headers.get('X-Upload-Token');

    // Si no hay ni sesión ni token, rechazar
    if (!session?.user?.email && !uploadToken) {
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
    console.log('language:', propertyData.language);

    if (!propertyData.title || !propertyData.description) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: title y description' },
        { status: 400 }
      );
    }

    // Validar language
    const language = propertyData.language || 'es';
    if (!['es', 'en'].includes(language)) {
      return NextResponse.json(
        { error: 'El idioma debe ser "es" o "en"' },
        { status: 400 }
      );
    }

    // Obtener ID del agente (desde sesión o desde datos enviados con token)
    let agentId: string;
    let agentEmail: string | undefined;

    if (uploadToken && !session) {
      // Validar token
      const { data: tokenData, error: tokenError } = await supabase
        .from('upload_tokens')
        .select('id, agent_id, expires_at, is_active')
        .eq('token', uploadToken)
        .single();

      if (tokenError || !tokenData) {
        return NextResponse.json(
          { error: 'Token inválido' },
          { status: 401 }
        );
      }

      if (!tokenData.is_active) {
        return NextResponse.json(
          { error: 'Token desactivado' },
          { status: 401 }
        );
      }

      if (new Date(tokenData.expires_at) < new Date()) {
        return NextResponse.json(
          { error: 'Token expirado' },
          { status: 401 }
        );
      }

      console.log('✅ Token validado correctamente para agente:', tokenData.agent_id);
      
      // Usar agent_id del token (puede venir en propertyData o del token)
      agentId = propertyData.agent_id || tokenData.agent_id;
    } else if (session?.user?.email) {
      // Usar email de la sesión
      agentEmail = session.user.email;
      agentId = ''; // Se obtendrá después
    } else {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Obtener datos del agente
    let agent;
    let agentError;

    if (agentEmail) {
      // Buscar por email (sesión normal)
      const result = await supabaseAdmin
        .from('agents')
        .select('id, credits, plan, properties_this_month, default_currency_id')
        .eq('email', agentEmail)
        .single();
      
      agent = result.data;
      agentError = result.error;
      
      if (agent) {
        agentId = agent.id;
      }
    } else {
      // Buscar por ID (token)
      const result = await supabaseAdmin
        .from('agents')
        .select('id, credits, plan, properties_this_month, default_currency_id')
        .eq('id', agentId)
        .single();
      
      agent = result.data;
      agentError = result.error;
    }

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
      language: language,
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
    console.log('language:', dataToInsert.language);

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