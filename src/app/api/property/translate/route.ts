import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { supabaseAdmin } from '@/lib/supabase';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function translateText(text: string, targetLang: 'es' | 'en'): Promise<string> {
  const langName = targetLang === 'es' ? 'Spanish' : 'English';
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are a professional real estate translator. Translate the following text to ${langName}. Maintain the tone and style suitable for real estate listings. Only provide the translation, no additional text.`,
      },
      {
        role: 'user',
        content: text,
      },
    ],
    temperature: 0.3,
  });

  return response.choices[0].message.content?.trim() || text;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { propertyId, targetLanguage, useAI } = await req.json();

    // 1. Obtener propiedad original
    const { data: original, error: fetchError } = await supabaseAdmin
      .from('properties')
      .select('*')
      .eq('id', propertyId)
      .single();

    if (fetchError || !original) {
      return NextResponse.json({ error: 'Propiedad no encontrada' }, { status: 404 });
    }

    let translatedTitle = original.title;
    let translatedDescription = original.description;
    let translatedAddress = original.address;
    let translatedCustomFields = original.custom_fields_data || {};

    // 2. Si se solicita traducción con IA
    if (useAI) {
      // Traducir campos principales
      [translatedTitle, translatedDescription] = await Promise.all([
        translateText(original.title, targetLanguage),
        translateText(original.description, targetLanguage),
      ]);

      if (original.address) {
        translatedAddress = await translateText(original.address, targetLanguage);
      }

      // 3. Traducir custom fields (solo tipo TEXT)
      if (original.custom_fields_data && original.property_type && original.listing_type) {
        // Obtener definiciones de custom fields
        const { data: customFields } = await supabaseAdmin
          .from('custom_fields')
          .select('field_key, field_type')
          .eq('property_type', original.property_type)
          .eq('listing_type', original.listing_type);

        if (customFields && customFields.length > 0) {
          const translatedFields: Record<string, string> = {};

          for (const [fieldKey, value] of Object.entries(original.custom_fields_data)) {
            const fieldDef = customFields.find(f => f.field_key === fieldKey);
            
            if (fieldDef && fieldDef.field_type === 'text' && value && typeof value === 'string') {
              const trimmedValue = value.trim();
              
              const shouldNotTranslate = 
                /^\d+$/.test(trimmedValue) || // Es número
                /^(sí|si|yes|no)$/i.test(trimmedValue) || // Es Sí/No
                trimmedValue.split(/\s+/).length <= 2; // 1-2 palabras
              
              if (shouldNotTranslate) {
                // Mantener valor original
                translatedFields[fieldKey] = value;
              } else {
                // Traducir
                translatedFields[fieldKey] = await translateText(value, targetLanguage);
              }
            } else {
              translatedFields[fieldKey] = value; // Mantener números y otros tipos
            }
          }

          translatedCustomFields = translatedFields;
        }
      }
    }

    // 4. Generar slug en idioma destino
    const slugBase = translatedTitle
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    // Buscar slugs existentes
    const { data: existingSlugs } = await supabaseAdmin
      .from('properties')
      .select('slug')
      .like('slug', `${slugBase}%`);

    let newSlug = slugBase;
    if (existingSlugs && existingSlugs.some(p => p.slug === slugBase)) {
      // Si existe, agregar número
      const slugNumbers = existingSlugs
        .map(p => {
          const match = p.slug.match(new RegExp(`${slugBase}-(\\d+)$`));
          return match ? parseInt(match[1]) : null;
        })
        .filter(n => n !== null);

      const nextNumber = slugNumbers.length > 0 ? Math.max(...slugNumbers) + 1 : 2;
      newSlug = `${slugBase}-${nextNumber}`;
    }

    // 5. Crear nueva propiedad traducida
    const { data: newProperty, error: insertError } = await supabaseAdmin
      .from('properties')
      .insert({
        agent_id: original.agent_id,
        title: translatedTitle,
        description: translatedDescription,
        price: original.price,
        currency_id: original.currency_id,
        address: translatedAddress,
        city: original.city,
        state: original.state,
        zip_code: original.zip_code,
        country: original.country,
        property_type: original.property_type,
        listing_type: original.listing_type,
        language: targetLanguage,
        photos: original.photos,
        latitude: original.latitude,
        longitude: original.longitude,
        plus_code: original.plus_code,
        show_map: original.show_map,
        custom_fields_data: translatedCustomFields,
        slug: newSlug,
        status: 'active',
        views: 0,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error al traducir:', insertError);
      return NextResponse.json({ error: 'Error al traducir' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      newPropertyId: newProperty.id,
      slug: newProperty.slug,
    });

  } catch (error) {
    console.error('Error en translate:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}