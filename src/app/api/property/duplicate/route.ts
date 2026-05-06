import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { supabaseAdmin } from '@/lib/supabase';

const BUCKET = 'property-photos';

/**
 * Copia físicamente las fotos de una propiedad a una nueva carpeta
 * en Supabase Storage y retorna las nuevas URLs públicas.
 */
async function copyPhotosToNewFolder(
  originalPhotos: string[],
  newPropertyId: string
): Promise<string[]> {
  const newPhotos: string[] = [];

  for (const photoUrl of originalPhotos) {
    try {
      // Extraer el path relativo dentro del bucket
      // Formato esperado: https://.../storage/v1/object/public/property-photos/AGENT_ID/PROP_ID/filename.jpg
      const urlParts = photoUrl.split(`/${BUCKET}/`);
      if (urlParts.length < 2) {
        // URL inesperada → mantener original para no perder la foto
        console.warn('URL de foto con formato inesperado, se mantiene original:', photoUrl);
        newPhotos.push(photoUrl);
        continue;
      }

      const originalPath = urlParts[1]; // "AGENT_ID/PROP_ID/filename.jpg"
      const pathSegments = originalPath.split('/');

      if (pathSegments.length < 3) {
        console.warn('Path de foto con menos segmentos de los esperados:', originalPath);
        newPhotos.push(photoUrl);
        continue;
      }

      const agentId = pathSegments[0];
      const fileName = pathSegments[pathSegments.length - 1];
      const newPath = `${agentId}/${newPropertyId}/${fileName}`;

      // Copiar archivo en Supabase Storage
      const { error: copyError } = await supabaseAdmin!.storage
        .from(BUCKET)
        .copy(originalPath, newPath);

      if (copyError) {
        console.error(`Error copiando ${originalPath} → ${newPath}:`, copyError);
        // Si falla la copia, mantener original para no perder la foto
        newPhotos.push(photoUrl);
        continue;
      }

      // Obtener URL pública del nuevo archivo
      const { data: publicUrlData } = supabaseAdmin!.storage
        .from(BUCKET)
        .getPublicUrl(newPath);

      newPhotos.push(publicUrlData.publicUrl);
    } catch (err) {
      console.error('Error inesperado copiando foto:', err);
      newPhotos.push(photoUrl); // fallback
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

    const { propertyId } = await req.json();

    // 1. Obtener propiedad original
    const { data: original, error: fetchError } = await supabaseAdmin!
      .from('properties')
      .select('*')
      .eq('id', propertyId)
      .single();

    if (fetchError || !original) {
      return NextResponse.json({ error: 'Propiedad no encontrada' }, { status: 404 });
    }

    // 2. Verificar plan y límite
    const { data: agent } = await supabaseAdmin!
      .from('agents')
      .select('plan, role, expires_at')
      .eq('id', original.agent_id)
      .single();

    const isProActivo =
      agent?.role === 'admin' ||
      (agent?.plan === 'pro' &&
        agent?.expires_at &&
        new Date(agent.expires_at) > new Date());

    const propertyLimit = isProActivo ? 150 : 5;

    const { count } = await supabaseAdmin!
      .from('properties')
      .select('*', { count: 'exact', head: true })
      .eq('agent_id', original.agent_id);

    if (count !== null && count >= propertyLimit) {
      return NextResponse.json(
        {
          error: isProActivo
            ? 'Has alcanzado el límite de 150 propiedades del plan Pro.'
            : 'Has alcanzado el límite de 5 propiedades. Actualiza a Pro para crear más.',
        },
        { status: 403 }
      );
    }

    // 3. Generar slug único
    const baseSlug = original.slug;
    const { data: existingSlugs } = await supabaseAdmin!
      .from('properties')
      .select('slug')
      .like('slug', `${baseSlug}%`);

    let nextNumber = 2;
    const slugNumbers =
      existingSlugs
        ?.map((p) => {
          const match = p.slug.match(new RegExp(`${baseSlug}-(\\d+)$`));
          return match ? parseInt(match[1]) : null;
        })
        .filter((n) => n !== null) || [];

    if (slugNumbers.length > 0) {
      nextNumber = Math.max(...slugNumbers) + 1;
    }

    const newSlug = `${baseSlug}-${nextNumber}`;

    // 4. Insertar la propiedad primero (sin fotos) para obtener el nuevo ID
    const { data: newProperty, error: insertError } = await supabaseAdmin!
      .from('properties')
      .insert({
        agent_id: original.agent_id,
        title: original.title,
        description: original.description,
        price: original.price,
        currency_id: original.currency_id,
        address: original.address,
        city: original.city,
        state: original.state,
        zip_code: original.zip_code,
        country: original.country,
        property_type: original.property_type,
        listing_type: original.listing_type,
        language: original.language,
        photos: [], // placeholder, se actualiza después de copiar
        latitude: original.latitude,
        longitude: original.longitude,
        plus_code: original.plus_code,
        show_map: original.show_map,
        custom_fields_data: original.custom_fields_data,
        slug: newSlug,
        status: 'active',
        views: 0,
      })
      .select()
      .single();

    if (insertError || !newProperty) {
      console.error('Error al duplicar:', insertError);
      return NextResponse.json({ error: 'Error al duplicar' }, { status: 500 });
    }

    // 5. Copiar fotos físicamente a la carpeta del nuevo ID
    let newPhotos: string[] = [];
    if (original.photos && original.photos.length > 0) {
      newPhotos = await copyPhotosToNewFolder(original.photos, newProperty.id);
    }

    // 6. Actualizar la propiedad con las nuevas URLs
    const { error: updateError } = await supabaseAdmin!
      .from('properties')
      .update({ photos: newPhotos })
      .eq('id', newProperty.id);

    if (updateError) {
      console.error('Error actualizando fotos duplicadas:', updateError);
      // La propiedad se creó, solo fallaron las fotos — no bloquear al usuario
    }

    return NextResponse.json({
      success: true,
      newPropertyId: newProperty.id,
      slug: newProperty.slug,
    });
  } catch (error) {
    console.error('Error en duplicate:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}