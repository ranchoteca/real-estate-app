import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    console.log('📥 Exportando propiedades para:', session.user.email);

    // Obtener agente
    const { data: agent, error: agentError } = await supabaseAdmin
      .from('agents')
      .select('id, name, full_name, email')
      .eq('email', session.user.email)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agente no encontrado' }, { status: 404 });
    }

    // Obtener todas las propiedades del agente
    const { data: properties, error: propertiesError } = await supabaseAdmin
      .from('properties')
      .select('*')
      .eq('agent_id', agent.id)
      .order('created_at', { ascending: false });

    if (propertiesError) {
      console.error('Error al obtener propiedades:', propertiesError);
      return NextResponse.json({ error: 'Error al exportar' }, { status: 500 });
    }

    if (!properties || properties.length === 0) {
      return NextResponse.json({ error: 'No tienes propiedades para exportar' }, { status: 400 });
    }

    // Generar CSV
    const csvRows: string[] = [];

    // Header
    csvRows.push([
      'Título',
      'Descripción',
      'Precio',
      'Dirección',
      'Ciudad',
      'Estado',
      'Código Postal',
      'Habitaciones',
      'Baños',
      'Pies Cuadrados',
      'Tipo',
      'Estado Propiedad',
      'Vistas',
      'Link Público',
      'URLs Fotos',
      'Fecha Creación'
    ].join(','));

    // Data rows
    for (const property of properties) {
      const appUrl = process.env.NEXTAUTH_URL || 'https://tu-app.vercel.app';
      const publicLink = `${appUrl}/p/${property.slug}`;
      const photosUrls = property.photos ? property.photos.join(' | ') : '';

      csvRows.push([
        escapeCsvValue(property.title),
        escapeCsvValue(property.description),
        property.price || '',
        escapeCsvValue(property.address || ''),
        escapeCsvValue(property.city || ''),
        escapeCsvValue(property.state || ''),
        escapeCsvValue(property.zip_code || ''),
        property.bedrooms || '',
        property.bathrooms || '',
        property.sqft || '',
        escapeCsvValue(property.property_type || ''),
        escapeCsvValue(property.status || ''),
        property.views || 0,
        publicLink,
        escapeCsvValue(photosUrls),
        new Date(property.created_at).toLocaleDateString('es-ES')
      ].join(','));
    }

    const csvContent = csvRows.join('\n');

    console.log('✅ CSV generado con', properties.length, 'propiedades');

    // Retornar CSV con headers apropiados
    const fileName = `mis-propiedades-${new Date().toISOString().split('T')[0]}.csv`;
    
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });

  } catch (error: any) {
    console.error('❌ Error al exportar:', error);
    return NextResponse.json({ 
      error: 'Error al exportar propiedades',
      details: error.message 
    }, { status: 500 });
  }
}

// Helper para escapar valores CSV (manejar comas y comillas)
function escapeCsvValue(value: string): string {
  if (!value) return '';
  
  // Si contiene coma, comilla o salto de línea, envolver en comillas
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    // Escapar comillas dobles duplicándolas
    return `"${value.replace(/"/g, '""')}"`;
  }
  
  return value;
}