import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { supabaseAdmin } from '@/lib/supabase';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const BUCKET = 'property-photos';

async function translateText(text: string, targetLang: 'es' | 'en'): Promise<string> {
  const langName = targetLang === 'es' ? 'Spanish' : 'English';
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are a professional real estate translator. Translate the following text to ${langName}. Maintain the tone and style suitable for real estate listings. Only provide the translation, no additional text.`,
      },
      { role: 'user', content: text },
    ],
    temperature: 0.3,
  });
  return response.choices[0].message.content?.trim() || text;
}

async function copyPhotosToNewFolder(
  originalPhotos: string[],
  newPropertyId: string
): Promise<string[]> {
  const newPhotos: string[] = [];

  for (const photoUrl of originalPhotos) {
    try {
      const urlParts = photoUrl.split(`/${BUCKET}/`);
      if (urlParts.length < 2) {
        console.warn('URL de foto con formato inesperado, se mantiene original:', photoUrl);
        newPhotos.push(photoUrl);
        continue;
      }

      const originalPath = urlParts[1];
      const pathSegments = originalPath.split('/');

      if (pathSegments.length < 3) {
        console.warn('Path de foto con menos segmentos de los esperados:', originalPath);
        newPhotos.push(photoUrl);
        continue;
      }

      const agentId = pathSegments[0];
      const fileName = pathSegments[pathSegments.length - 1];
      const newPath = `${agentId}/${newPropertyId}/${fileName}`;

      const { error: copyError } = await supabaseAdmin!.storage
        .from(BUCKET)
        .copy(originalPath, newPath);

      if (copyError) {
        console.error(`Error copiando ${originalPath} → ${newPath}:`, copyError);
        newPhotos.push(photoUrl);
        continue;
      }

      const { data: publicUrlData } = supabaseAdmin!.storage
        .from(BUCKET)
        .getPublicUrl(newPath);

      newPhotos.push(publicUrlData.publicUrl);
    } catch (err) {
      console.error('Error inesperado copiando foto:', err);
      newPhotos.push(photoUrl);
    }
  }

  return newPhotos;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { data: agent } = await supabaseAdmin!
      .from('agents')
      .select('plan, role, expires_at')
      .eq('email', session.user.email)
      .single();

    const isProActivo =
      agent?.role === 'admin' ||
      (agent?.plan === 'pro' && !!agent?.expires_at && new Date(agent.expires_at) > new Date());

    if (!isProActivo) {
      return NextResponse.json(
        { error: 'Esta función requiere un plan Pro activo.' },
        { status: 403 }
      );
    }

    const { propertyId, targetLanguage, useAI } = await req.json();

    // 1. Obtener propiedad original
    const { data: original, error: fetchError } = await supabaseAdmin!
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

    // 2. Traducción con IA (sin cambios)
    if (useAI) {
      [translatedTitle, translatedDescription] = await Promise.all([
        translateText(original.title, targetLanguage),
        translateText(original.description, targetLanguage),
      ]);

      if (original.address) {
        translatedAddress = await translateText(original.address, targetLanguage);
      }

      if (original.custom_fields_data && original.property_type && original.listing_type) {
        const { data: customFields } = await supabaseAdmin!
          .from('custom_fields')
          .select('field_key, field_type')
          .eq('property_type', original.property_type)
          .eq('listing_type', original.listing_type);

        if (customFields && customFields.length > 0) {
          const translatedFields: Record<string, string> = {};
          for (const [fieldKey, value] of Object.entries(original.custom_fields_data)) {
            const fieldDef = customFields.find((f) => f.field_key === fieldKey);
            if (fieldDef && fieldDef.field_type === 'text' && value && typeof value === 'string') {
              const trimmedValue = value.trim();
              const shouldNotTranslate =
                /^\d+$/.test(trimmedValue) ||
                /^(sí|si|yes|no)$/i.test(trimmedValue) ||
                trimmedValue.split(/\s+/).length <= 2;
              translatedFields[fieldKey] = shouldNotTranslate
                ? value
                : await translateText(value, targetLanguage);
            } else {
              translatedFields[fieldKey] = value as string;
            }
          }
          translatedCustomFields = translatedFields;
        }
      }
    }

    // 3. Generar slug (sin cambios)
    const slugBase = translatedTitle
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const { data: existingSlugs } = await supabaseAdmin!
      .from('properties')
      .select('slug')
      .like('slug', `${slugBase}%`);

    let newSlug = slugBase;
    if (existingSlugs && existingSlugs.some((p) => p.slug === slugBase)) {
      const slugNumbers = existingSlugs
        .map((p) => {
          const match = p.slug.match(new RegExp(`${slugBase}-(\\d+)$`));
          return match ? parseInt(match[1]) : null;
        })
        .filter((n) => n !== null);
      const nextNumber = slugNumbers.length > 0 ? Math.max(...slugNumbers) + 1 : 2;
      newSlug = `${slugBase}-${nextNumber}`;
    }

    // 4. Insertar propiedad primero (sin fotos) para tener el nuevo ID
    const { data: newProperty, error: insertError } = await supabaseAdmin!
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
        photos: [], // placeholder
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

    if (insertError || !newProperty) {
      console.error('Error al traducir:', insertError);
      return NextResponse.json({ error: 'Error al traducir' }, { status: 500 });
    }

    // 5. Copiar fotos físicamente a la carpeta del nuevo ID
    let newPhotos: string[] = [];
    if (original.photos && original.photos.length > 0) {
      newPhotos = await copyPhotosToNewFolder(original.photos, newProperty.id);
    }

    // 6. Actualizar propiedad con las nuevas URLs
    const { error: updateError } = await supabaseAdmin!
      .from('properties')
      .update({ photos: newPhotos })
      .eq('id', newProperty.id);

    if (updateError) {
      console.error('Error actualizando fotos traducidas:', updateError);
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