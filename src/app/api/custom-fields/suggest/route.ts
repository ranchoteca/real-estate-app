import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { supabaseAdmin } from '@/lib/supabase';

const MAX_FIELDS_PER_COMBO = 10;

// Definición de campos sugeridos bilingües
const SUGGESTED_FIELDS = {
  house: {
    sale: [
      { icon: '🛏️', name_es: 'Habitaciones', name_en: 'Bedrooms', type: 'number', placeholder_es: 'Ej: 3', placeholder_en: 'e.g: 3' },
      { icon: '🚿', name_es: 'Baños', name_en: 'Bathrooms', type: 'number', placeholder_es: 'Ej: 2', placeholder_en: 'e.g: 2' },
      { icon: '🚗', name_es: 'Garaje', name_en: 'Garage', type: 'text', placeholder_es: 'Ej: 2 espacios', placeholder_en: 'e.g: 2 spaces' },
      { icon: '📏', name_es: 'Área construcción (m²)', name_en: 'Built area (sqm)', type: 'number', placeholder_es: 'Ej: 150', placeholder_en: 'e.g: 150' },
      { icon: '🌳', name_es: 'Área terreno (m²)', name_en: 'Land area (sqm)', type: 'number', placeholder_es: 'Ej: 250', placeholder_en: 'e.g: 250' },
    ],
    rent: [
      { icon: '🛏️', name_es: 'Habitaciones', name_en: 'Bedrooms', type: 'number', placeholder_es: 'Ej: 3', placeholder_en: 'e.g: 3' },
      { icon: '🚿', name_es: 'Baños', name_en: 'Bathrooms', type: 'number', placeholder_es: 'Ej: 2', placeholder_en: 'e.g: 2' },
      { icon: '🚗', name_es: 'Garaje', name_en: 'Garage', type: 'text', placeholder_es: 'Ej: 2 espacios', placeholder_en: 'e.g: 2 spaces' },
      { icon: '💡', name_es: 'Servicios incluidos', name_en: 'Utilities included', type: 'text', placeholder_es: 'Ej: Agua, luz', placeholder_en: 'e.g: Water, electricity' },
      { icon: '🐶', name_es: 'Mascotas', name_en: 'Pets', type: 'text', placeholder_es: 'Ej: Permitidas', placeholder_en: 'e.g: Allowed' },
    ],
  },
  condo: {
    sale: [
      { icon: '🛏️', name_es: 'Habitaciones', name_en: 'Bedrooms', type: 'number', placeholder_es: 'Ej: 2', placeholder_en: 'e.g: 2' },
      { icon: '🚿', name_es: 'Baños', name_en: 'Bathrooms', type: 'number', placeholder_es: 'Ej: 2', placeholder_en: 'e.g: 2' },
      { icon: '🚗', name_es: 'Estacionamiento', name_en: 'Parking', type: 'text', placeholder_es: 'Ej: 1 espacio', placeholder_en: 'e.g: 1 space' },
      { icon: '🏊', name_es: 'Amenidades', name_en: 'Amenities', type: 'text', placeholder_es: 'Ej: Piscina, gimnasio', placeholder_en: 'e.g: Pool, gym' },
      { icon: '📏', name_es: 'Área (m²)', name_en: 'Area (sqm)', type: 'number', placeholder_es: 'Ej: 80', placeholder_en: 'e.g: 80' },
    ],
    rent: [
      { icon: '🛏️', name_es: 'Habitaciones', name_en: 'Bedrooms', type: 'number', placeholder_es: 'Ej: 2', placeholder_en: 'e.g: 2' },
      { icon: '🚿', name_es: 'Baños', name_en: 'Bathrooms', type: 'number', placeholder_es: 'Ej: 2', placeholder_en: 'e.g: 2' },
      { icon: '🚗', name_es: 'Estacionamiento', name_en: 'Parking', type: 'text', placeholder_es: 'Ej: 1 espacio', placeholder_en: 'e.g: 1 space' },
      { icon: '🏊', name_es: 'Amenidades', name_en: 'Amenities', type: 'text', placeholder_es: 'Ej: Piscina, gym', placeholder_en: 'e.g: Pool, gym' },
      { icon: '💰', name_es: 'Mantenimiento', name_en: 'HOA fee', type: 'text', placeholder_es: 'Ej: Incluido', placeholder_en: 'e.g: Included' },
    ],
  },
  apartment: {
    sale: [
      { icon: '🛏️', name_es: 'Habitaciones', name_en: 'Bedrooms', type: 'number', placeholder_es: 'Ej: 2', placeholder_en: 'e.g: 2' },
      { icon: '🚿', name_es: 'Baños', name_en: 'Bathrooms', type: 'number', placeholder_es: 'Ej: 1', placeholder_en: 'e.g: 1' },
      { icon: '📏', name_es: 'Área (m²)', name_en: 'Area (sqm)', type: 'number', placeholder_es: 'Ej: 65', placeholder_en: 'e.g: 65' },
      { icon: '🏢', name_es: 'Piso', name_en: 'Floor', type: 'text', placeholder_es: 'Ej: Piso 3', placeholder_en: 'e.g: 3rd floor' },
      { icon: '🚗', name_es: 'Estacionamiento', name_en: 'Parking', type: 'text', placeholder_es: 'Ej: 1 espacio', placeholder_en: 'e.g: 1 space' },
    ],
    rent: [
      { icon: '🛏️', name_es: 'Habitaciones', name_en: 'Bedrooms', type: 'number', placeholder_es: 'Ej: 2', placeholder_en: 'e.g: 2' },
      { icon: '🚿', name_es: 'Baños', name_en: 'Bathrooms', type: 'number', placeholder_es: 'Ej: 1', placeholder_en: 'e.g: 1' },
      { icon: '📏', name_es: 'Área (m²)', name_en: 'Area (sqm)', type: 'number', placeholder_es: 'Ej: 65', placeholder_en: 'e.g: 65' },
      { icon: '🏢', name_es: 'Piso', name_en: 'Floor', type: 'text', placeholder_es: 'Ej: Piso 3', placeholder_en: 'e.g: 3rd floor' },
      { icon: '💡', name_es: 'Servicios incluidos', name_en: 'Utilities included', type: 'text', placeholder_es: 'Ej: Agua', placeholder_en: 'e.g: Water' },
    ],
  },
  land: {
    sale: [
      { icon: '📏', name_es: 'Área (m²)', name_en: 'Area (sqm)', type: 'number', placeholder_es: 'Ej: 1000', placeholder_en: 'e.g: 1000' },
      { icon: '🌳', name_es: 'Topografía', name_en: 'Topography', type: 'text', placeholder_es: 'Ej: Plano', placeholder_en: 'e.g: Flat' },
      { icon: '💧', name_es: 'Servicios', name_en: 'Utilities', type: 'text', placeholder_es: 'Ej: Agua, luz', placeholder_en: 'e.g: Water, electricity' },
      { icon: '🏗️', name_es: 'Zonificación', name_en: 'Zoning', type: 'text', placeholder_es: 'Ej: Residencial', placeholder_en: 'e.g: Residential' },
      { icon: '🚗', name_es: 'Acceso', name_en: 'Access', type: 'text', placeholder_es: 'Ej: Calle pavimentada', placeholder_en: 'e.g: Paved road' },
    ],
    rent: [
      { icon: '📏', name_es: 'Área (m²)', name_en: 'Area (sqm)', type: 'number', placeholder_es: 'Ej: 500', placeholder_en: 'e.g: 500' },
      { icon: '🌳', name_es: 'Uso permitido', name_en: 'Permitted use', type: 'text', placeholder_es: 'Ej: Agrícola', placeholder_en: 'e.g: Agricultural' },
      { icon: '💧', name_es: 'Servicios', name_en: 'Utilities', type: 'text', placeholder_es: 'Ej: Agua', placeholder_en: 'e.g: Water' },
      { icon: '🚗', name_es: 'Acceso', name_en: 'Access', type: 'text', placeholder_es: 'Ej: Camino de tierra', placeholder_en: 'e.g: Dirt road' },
      { icon: '🔒', name_es: 'Cercado', name_en: 'Fencing', type: 'text', placeholder_es: 'Ej: Sí', placeholder_en: 'e.g: Yes' },
    ],
  },
  commercial: {
    sale: [
      { icon: '📏', name_es: 'Área (m²)', name_en: 'Area (sqm)', type: 'number', placeholder_es: 'Ej: 200', placeholder_en: 'e.g: 200' },
      { icon: '🏢', name_es: 'Tipo de local', name_en: 'Property type', type: 'text', placeholder_es: 'Ej: Oficina', placeholder_en: 'e.g: Office' },
      { icon: '🚗', name_es: 'Estacionamientos', name_en: 'Parking spaces', type: 'number', placeholder_es: 'Ej: 5', placeholder_en: 'e.g: 5' },
      { icon: '🏗️', name_es: 'Año construcción', name_en: 'Year built', type: 'number', placeholder_es: 'Ej: 2020', placeholder_en: 'e.g: 2020' },
      { icon: '💡', name_es: 'Servicios', name_en: 'Utilities', type: 'text', placeholder_es: 'Ej: Todos', placeholder_en: 'e.g: All' },
    ],
    rent: [
      { icon: '📏', name_es: 'Área (m²)', name_en: 'Area (sqm)', type: 'number', placeholder_es: 'Ej: 150', placeholder_en: 'e.g: 150' },
      { icon: '🏢', name_es: 'Tipo de local', name_en: 'Property type', type: 'text', placeholder_es: 'Ej: Local comercial', placeholder_en: 'e.g: Retail' },
      { icon: '🚗', name_es: 'Estacionamientos', name_en: 'Parking spaces', type: 'number', placeholder_es: 'Ej: 3', placeholder_en: 'e.g: 3' },
      { icon: '💰', name_es: 'Gastos comunes', name_en: 'Common expenses', type: 'text', placeholder_es: 'Ej: Incluidos', placeholder_en: 'e.g: Included' },
      { icon: '🏪', name_es: 'Uso recomendado', name_en: 'Recommended use', type: 'text', placeholder_es: 'Ej: Restaurante', placeholder_en: 'e.g: Restaurant' },
    ],
  },
  hotel: {
    sale: [
      { icon: '📏', name_es: 'Área (m²)', name_en: 'Area (sqm)', type: 'number', placeholder_es: 'Ej: 500', placeholder_en: 'e.g: 500' },
      { icon: '🛏️', name_es: 'Habitaciones', name_en: 'Rooms', type: 'number', placeholder_es: 'Ej: 20', placeholder_en: 'e.g: 20' },
      { icon: '🏊', name_es: 'Amenidades', name_en: 'Amenities', type: 'text', placeholder_es: 'Ej: Piscina, spa', placeholder_en: 'e.g: Pool, spa' },
      { icon: '🚗', name_es: 'Estacionamientos', name_en: 'Parking spaces', type: 'number', placeholder_es: 'Ej: 10', placeholder_en: 'e.g: 10' },
      { icon: '🏗️', name_es: 'Año construcción', name_en: 'Year built', type: 'number', placeholder_es: 'Ej: 2015', placeholder_en: 'e.g: 2015' },
    ],
    rent: [
      { icon: '📏', name_es: 'Área (m²)', name_en: 'Area (sqm)', type: 'number', placeholder_es: 'Ej: 500', placeholder_en: 'e.g: 500' },
      { icon: '🛏️', name_es: 'Habitaciones', name_en: 'Rooms', type: 'number', placeholder_es: 'Ej: 20', placeholder_en: 'e.g: 20' },
      { icon: '🏊', name_es: 'Amenidades', name_en: 'Amenities', type: 'text', placeholder_es: 'Ej: Piscina, spa', placeholder_en: 'e.g: Pool, spa' },
      { icon: '💰', name_es: 'Gastos comunes', name_en: 'Common expenses', type: 'text', placeholder_es: 'Ej: Incluidos', placeholder_en: 'e.g: Included' },
      { icon: '🚗', name_es: 'Estacionamientos', name_en: 'Parking spaces', type: 'number', placeholder_es: 'Ej: 10', placeholder_en: 'e.g: 10' },
    ],
  },
  finca: {
  sale: [
    { icon: '📏', name_es: 'Área del terreno (m²)', name_en: 'Land area (sqm)', type: 'number', placeholder_es: 'Ej: 50000', placeholder_en: 'e.g: 50000' },
    { icon: '🌾', name_es: 'Área en hectáreas', name_en: 'Area in hectares', type: 'number', placeholder_es: 'Ej: 5', placeholder_en: 'e.g: 5' },
    { icon: '⛰️', name_es: 'Topografía', name_en: 'Topography', type: 'text', placeholder_es: 'Ej: Plana, quebrada, mixta', placeholder_en: 'e.g: Flat, hilly, mixed' },
    { icon: '🌱', name_es: 'Tipo de terreno', name_en: 'Land type', type: 'text', placeholder_es: 'Ej: Agrícola, ganadero', placeholder_en: 'e.g: Agricultural, livestock' },
    { icon: '💧', name_es: 'Fuente de agua', name_en: 'Water source', type: 'text', placeholder_es: 'Ej: Pozo, río, naciente', placeholder_en: 'e.g: Well, river, spring' },
    { icon: '🏠', name_es: 'Construcciones', name_en: 'Buildings', type: 'text', placeholder_es: 'Ej: Casa, bodega', placeholder_en: 'e.g: House, warehouse' },
    { icon: '⚡', name_es: 'Electricidad', name_en: 'Electricity', type: 'text', placeholder_es: 'Ej: Disponible', placeholder_en: 'e.g: Available' },
    { icon: '🚜', name_es: 'Acceso', name_en: 'Access', type: 'text', placeholder_es: 'Ej: Calle asfaltada o lastre', placeholder_en: 'e.g: Asphalt or gravel road' },
  ],
  rent: [
    { icon: '📏', name_es: 'Área del terreno (m²)', name_en: 'Land area (sqm)', type: 'number', placeholder_es: 'Ej: 50000', placeholder_en: 'e.g: 50000' },
    { icon: '🌾', name_es: 'Área en hectáreas', name_en: 'Area in hectares', type: 'number', placeholder_es: 'Ej: 5', placeholder_en: 'e.g: 5' },
    { icon: '⛰️', name_es: 'Topografía', name_en: 'Topography', type: 'text', placeholder_es: 'Ej: Plana, quebrada, mixta', placeholder_en: 'e.g: Flat, hilly, mixed' },
    { icon: '🌱', name_es: 'Tipo de terreno', name_en: 'Land type', type: 'text', placeholder_es: 'Ej: Agrícola, ganadero', placeholder_en: 'e.g: Agricultural, livestock' },
    { icon: '💧', name_es: 'Fuente de agua', name_en: 'Water source', type: 'text', placeholder_es: 'Ej: Pozo, río, naciente', placeholder_en: 'e.g: Well, river, spring' },
    { icon: '🏠', name_es: 'Construcciones', name_en: 'Buildings', type: 'text', placeholder_es: 'Ej: Casa, bodega', placeholder_en: 'e.g: House, warehouse' },
    { icon: '🚜', name_es: 'Acceso', name_en: 'Access', type: 'text', placeholder_es: 'Ej: Calle asfaltada o lastre', placeholder_en: 'e.g: Asphalt or gravel road' },
  ],
},
  ranch: {
    sale: [
      { icon: '📏', name_es: 'Área (m²)', name_en: 'Area (sqm)', type: 'number', placeholder_es: 'Ej: 5000', placeholder_en: 'e.g: 5000' },
      { icon: '🛏️', name_es: 'Habitaciones', name_en: 'Bedrooms', type: 'number', placeholder_es: 'Ej: 4', placeholder_en: 'e.g: 4' },
      { icon: '🚿', name_es: 'Baños', name_en: 'Bathrooms', type: 'number', placeholder_es: 'Ej: 3', placeholder_en: 'e.g: 3' },
      { icon: '🏊', name_es: 'Amenidades', name_en: 'Amenities', type: 'text', placeholder_es: 'Ej: Piscina, jardín', placeholder_en: 'e.g: Pool, garden' },
      { icon: '🌳', name_es: 'Área verde (m²)', name_en: 'Green area (sqm)', type: 'number', placeholder_es: 'Ej: 3000', placeholder_en: 'e.g: 3000' },
    ],
    rent: [
      { icon: '📏', name_es: 'Área (m²)', name_en: 'Area (sqm)', type: 'number', placeholder_es: 'Ej: 5000', placeholder_en: 'e.g: 5000' },
      { icon: '🛏️', name_es: 'Habitaciones', name_en: 'Bedrooms', type: 'number', placeholder_es: 'Ej: 4', placeholder_en: 'e.g: 4' },
      { icon: '🚿', name_es: 'Baños', name_en: 'Bathrooms', type: 'number', placeholder_es: 'Ej: 3', placeholder_en: 'e.g: 3' },
      { icon: '🏊', name_es: 'Amenidades', name_en: 'Amenities', type: 'text', placeholder_es: 'Ej: Piscina, jardín', placeholder_en: 'e.g: Pool, garden' },
      { icon: '🌳', name_es: 'Área verde (m²)', name_en: 'Green area (sqm)', type: 'number', placeholder_es: 'Ej: 3000', placeholder_en: 'e.g: 3000' },
    ],
  },
  other: {
    sale: [
      { icon: '📏', name_es: 'Área (m²)', name_en: 'Area (sqm)', type: 'number', placeholder_es: 'Ej: 200', placeholder_en: 'e.g: 200' },
      { icon: '📝', name_es: 'Descripción del tipo', name_en: 'Type description', type: 'text', placeholder_es: 'Ej: Bodega', placeholder_en: 'e.g: Warehouse' },
      { icon: '🚗', name_es: 'Estacionamientos', name_en: 'Parking spaces', type: 'number', placeholder_es: 'Ej: 2', placeholder_en: 'e.g: 2' },
    ],
    rent: [
      { icon: '📏', name_es: 'Área (m²)', name_en: 'Area (sqm)', type: 'number', placeholder_es: 'Ej: 200', placeholder_en: 'e.g: 200' },
      { icon: '📝', name_es: 'Descripción del tipo', name_en: 'Type description', type: 'text', placeholder_es: 'Ej: Bodega', placeholder_en: 'e.g: Warehouse' },
      { icon: '🚗', name_es: 'Estacionamientos', name_en: 'Parking spaces', type: 'number', placeholder_es: 'Ej: 2', placeholder_en: 'e.g: 2' },
    ],
  },
};

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { property_type, listing_type, language } = await req.json();

    // Validaciones
    if (!property_type || !listing_type || !language) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 });
    }

    // Obtener agente
    const { data: agent } = await supabaseAdmin
      .from('agents')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (!agent) {
      return NextResponse.json({ error: 'Agente no encontrado' }, { status: 404 });
    }

    // CRÍTICO: Verificar que NO existan campos para esta combinación
    const { data: existingFields } = await supabaseAdmin
      .from('custom_fields')
      .select('id')
      .eq('agent_id', agent.id)
      .eq('property_type', property_type)
      .eq('listing_type', listing_type);

    if (existingFields && existingFields.length > 0) {
      return NextResponse.json(
        { error: 'Ya existen campos para esta combinación' },
        { status: 400 }
      );
    }

    // Obtener campos sugeridos
    const suggestedFields = SUGGESTED_FIELDS[property_type as keyof typeof SUGGESTED_FIELDS]?.[listing_type as 'sale' | 'rent'];

    if (!suggestedFields) {
      return NextResponse.json({ error: 'No hay campos sugeridos para esta combinación' }, { status: 404 });
    }

    // Crear campos en batch
    const fieldsToInsert = suggestedFields.map((field, index) => ({
      agent_id: agent.id,
      field_key: `cf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      property_type,
      listing_type,
      field_name: language === 'es' ? field.name_es : field.name_en,
      field_name_en: field.name_en,
      field_type: field.type,
      placeholder: language === 'es' ? field.placeholder_es : field.placeholder_en,
      icon: field.icon,
      display_order: index,
    }));

    const { data: createdFields, error: createError } = await supabaseAdmin
      .from('custom_fields')
      .insert(fieldsToInsert)
      .select();

    if (createError) {
      console.error('Error creando campos sugeridos:', createError);
      return NextResponse.json({ error: 'Error al crear campos' }, { status: 500 });
    }

    console.log(`✅ ${createdFields.length} campos sugeridos creados para ${property_type} ${listing_type} (${language})`);

    return NextResponse.json({
      success: true,
      fields: createdFields,
      count: createdFields.length,
    });

  } catch (error: any) {
    console.error('Error en suggest fields:', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}