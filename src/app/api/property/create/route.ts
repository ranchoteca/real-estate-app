import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { supabaseAdmin } from '@/lib/supabase';

// Función para generar slug único
function generateSlug(title: string): string {
  const baseSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // Reemplazar caracteres especiales con guiones
    .replace(/^-+|-+$/g, ''); // Eliminar guiones al inicio/final
  
  // Agregar timestamp para unicidad
  const timestamp = Date.now().toString(36); // Base36 para slug más corto
  return `${baseSlug}-${timestamp}`;
}

export async function POST(req: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Obtener datos de la propiedad
    const propertyData = await req.json();

    // Validar campos requeridos
    if (!propertyData.title || !propertyData.description) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: title y description' },
        { status: 400 }
      );
    }

    console.log('💾 Creando propiedad en Supabase...');

    // 1. Obtener el agente actual (por email)
    const { data: agent, error: agentError } = await supabaseAdmin
      .from('agents')
      .select('id, credits')
      .eq('email', session.user.email)
      .single();

    if (agentError || !agent) {
      console.error('Error al obtener agente:', agentError);
      return NextResponse.json(
        { error: 'Agente no encontrado' },
        { status: 404 }
      );
    }

    // 2. Verificar créditos
    if (agent.credits < 1) {
      return NextResponse.json(
        { error: 'No tienes créditos suficientes' },
        { status: 403 }
      );
    }

    // 3. Generar slug único
    const slug = generateSlug(propertyData.title);

    // 4. Crear propiedad
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
        bedrooms: propertyData.bedrooms,
        bathrooms: propertyData.bathrooms,
        sqft: propertyData.sqft,
        property_type: propertyData.property_type || 'house',
        photos: propertyData.photos || [],
        audio_url: propertyData.audio_url || null,
        status: 'active',
        slug,
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

    // 5. Descontar 1 crédito
    const { error: creditError } = await supabaseAdmin
      .from('agents')
      .update({ credits: agent.credits - 1 })
      .eq('id', agent.id);

    if (creditError) {
      console.error('Error al descontar crédito:', creditError);
      // No retornamos error porque la propiedad ya se creó
      // Solo logeamos el error
    }

    console.log('✅ Propiedad creada exitosamente');
    console.log('ID:', property.id);
    console.log('Slug:', property.slug);
    console.log('Créditos restantes:', agent.credits - 1);

    return NextResponse.json({
      success: true,
      propertyId: property.slug, // Usamos slug para la URL
      property: {
        id: property.id,
        slug: property.slug,
        title: property.title,
        price: property.price,
      },
      creditsRemaining: agent.credits - 1,
    });

  } catch (error) {
    console.error('❌ Error al crear propiedad:', error);
    
    return NextResponse.json(
      { 
        error: 'Error al crear la propiedad',
        details: error
      },
      { status: 500 }
    );
  }
}