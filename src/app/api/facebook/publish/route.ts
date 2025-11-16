import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const propertyId = req.nextUrl.searchParams.get('propertyId');
  
  if (!propertyId) {
    return NextResponse.json({ error: 'propertyId requerido' }, { status: 400 });
  }

  return handlePublish(propertyId);
}

export async function POST(req: NextRequest) {
  const { propertyId } = await req.json();
  
  if (!propertyId) {
    return NextResponse.json({ error: 'propertyId requerido' }, { status: 400 });
  }

  return handlePublish(propertyId);
}

// Función para construir el mensaje mejorado de Facebook
async function buildFacebookMessage(property: any, agent: any, customFieldsMap: Map<string, string>): Promise<string> {
  // 1. Tipo de operación con icono de bombillo
  const operationType = property.listing_type === 'rent' ? '🎯 ALQUILER' : '🎯 VENTA';
  
  // 2. Descripción corta inteligente (primeras 2 oraciones completas)
  let shortDescription = 'Excelente oportunidad inmobiliaria';
  
  if (property.description) {
    // Dividir por puntos para obtener oraciones completas
    const sentences = property.description
      .split(/\.(?=\s|$)/) // Dividir solo por punto seguido de espacio o fin de texto
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0);
    
    if (sentences.length >= 2) {
      // Tomar las primeras 2 oraciones completas
      shortDescription = sentences[0] + '. ' + sentences[1] + '.';
    } else if (sentences.length === 1) {
      // Si solo hay 1 oración, usarla completa
      shortDescription = sentences[0] + '.';
    } else {
      // Fallback si no hay oraciones bien formadas
      shortDescription = property.description.substring(0, 150).trim();
      if (property.description.length > 150) {
        shortDescription += '...';
      }
    }
  }
  
  // 3. Ubicación
  const locationParts = [property.city, property.state].filter(Boolean);
  const displayLocation = locationParts.length > 0 
    ? locationParts.join(', ') 
    : property.address || 'Ubicación disponible';
  
  // 4. Precio formateado
  const displayPrice = property.price 
    ? `${Number(property.price).toLocaleString()}` 
    : 'Precio a consultar';
  
  // 5. Campos personalizados (custom fields) - usando los nombres reales
  let customFieldsText = '';
  if (property.custom_fields_data && typeof property.custom_fields_data === 'object') {
    const fields = Object.entries(property.custom_fields_data)
      .filter(([_, value]) => value !== null && value !== undefined && value !== '')
      .map(([fieldKey, value]) => {
        // Obtener el nombre real del campo desde el Map
        const fieldName = customFieldsMap.get(fieldKey) || fieldKey;
        
        // Formatear el valor (manejar booleanos, números, etc)
        let formattedValue = value;
        if (typeof value === 'boolean') {
          formattedValue = value ? 'Sí' : 'No';
        }
        
        return `✅ ${fieldName}: ${formattedValue}`;
      });
    
    if (fields.length > 0) {
      customFieldsText = '\n\n✨ Características\n' + fields.join('\n');
    }
  }
  
  // 6. Links
  const propertyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/p/${property.slug}`;
  const agentPortfolioUrl = `${process.env.NEXT_PUBLIC_APP_URL}/agent/${agent.username}`;
  
  // 7. Nombre del agente y teléfono
  const agentName = agent.full_name || agent.name || 'Agente inmobiliario';
  const agentPhone = agent.phone || '';
  
  // 8. Construir mensaje completo
  const message = `
${operationType}

📝 ${shortDescription}

🏡 ${property.title}

📍 ${displayLocation}

💰 ${displayPrice}${customFieldsText}

📅 Agende su visita con ${agentName}${agentPhone ? ` al 📱 ${agentPhone}` : ''}

🔗 Link de la propiedad: ${propertyUrl}

💼 Mira el portafolio del agente: ${agentPortfolioUrl}
  `.trim();
  
  return message;
}

function handlePublish(propertyId: string) {
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  const sendEvent = async (data: any) => {
    try {
      await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
    } catch (err) {
      console.error('Error enviando evento SSE:', err);
    }
  };

  (async () => {
    try {
      const session = await getServerSession(authOptions);
      console.log('🔍 Session completa:', JSON.stringify(session, null, 2));
      
      if (!session?.user?.email) {
        await sendEvent({ error: 'No autenticado', progress: 0 });
        await writer.close();
        return;
      }

      const userEmail = session.user.email;
      console.log('📧 Email del usuario:', userEmail);
      console.log('🏠 Property ID recibido:', propertyId);

      await sendEvent({ message: 'Obteniendo datos...', progress: 10 });

      // 1. Obtener datos del agente (agregamos username, full_name, phone)
      const { data: agent, error: agentError } = await supabaseAdmin
        .from('agents')
        .select('id, username, full_name, name, phone, facebook_page_id, facebook_access_token, fb_ai_enabled, fb_brand_color_primary, fb_brand_color_secondary, fb_template')
        .eq('email', userEmail)
        .single();

      if (agentError || !agent) {
        console.error('❌ Error obteniendo agente:', agentError);
        await sendEvent({ error: 'Agente no encontrado', progress: 0 });
        await writer.close();
        return;
      }

      console.log('✅ Agent obtenido correctamente:', agent.id);

      if (!agent.facebook_page_id || !agent.facebook_access_token) {
        await sendEvent({ error: 'Facebook no conectado', progress: 0 });
        await writer.close();
        return;
      }

      // 2. Obtener propiedad (agregamos listing_type, slug, custom_fields_data)
      const { data: property, error: propertyError } = await supabaseAdmin
        .from('properties')
        .select('id, title, description, price, city, state, address, photos, agent_id, property_type, listing_type, slug, custom_fields_data')
        .eq('id', propertyId)
        .single();

      if (propertyError || !property) {
        console.error('❌ Error obteniendo propiedad:', propertyError);
        console.error('🔍 Property ID buscado:', propertyId);
        await sendEvent({ error: 'Propiedad no encontrada', progress: 0 });
        await writer.close();
        return;
      }

      console.log('✅ Propiedad encontrada:', property.title);
      console.log('📋 Custom fields:', property.custom_fields_data);

      // 2.1 Obtener los nombres reales de los custom fields
      const customFieldsMap = new Map<string, string>();
      
      if (property.custom_fields_data && Object.keys(property.custom_fields_data).length > 0) {
        const fieldKeys = Object.keys(property.custom_fields_data);
        
        console.log('🔍 Buscando nombres de campos personalizados:', fieldKeys);
        
        const { data: customFields, error: fieldsError } = await supabaseAdmin
          .from('custom_fields')
          .select('field_key, field_name')
          .in('field_key', fieldKeys);
        
        if (!fieldsError && customFields) {
          customFields.forEach(field => {
            customFieldsMap.set(field.field_key, field.field_name);
          });
          console.log('✅ Nombres de campos obtenidos:', Object.fromEntries(customFieldsMap));
        } else {
          console.error('⚠️ Error obteniendo nombres de campos:', fieldsError);
        }
      }

      await sendEvent({ message: 'Preparando imágenes...', progress: 20 });

      // Las imágenes están en el campo photos (es un array de strings)
      let imageUrls: string[] = property.photos || [];
      
      if (imageUrls.length === 0) {
        await sendEvent({ error: 'La propiedad no tiene imágenes', progress: 0 });
        await writer.close();
        return;
      }

      console.log(`✅ Imágenes encontradas: ${imageUrls.length}`);

      let flyerUrl: string | null = null;

      // 3. Generar flyer con IA si está habilitado
      if (agent.fb_ai_enabled) {
        await sendEvent({ message: '🎨 Generando diseño con IA...', progress: 30 });

        try {
          // Construir location desde los campos disponibles
          const locationParts = [property.city, property.state].filter(Boolean);
          const location = locationParts.length > 0 ? locationParts.join(', ') : property.address || 'Ubicación disponible';

          console.log('📤 Enviando datos a generate-flyer:', {
            propertyId: property.id,
            hasPhotos: property.photos?.length || 0,
            firstPhoto: property.photos?.[0] || 'none',
          });

          const flyerResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/openai/generate-flyer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              property: {
                id: property.id,
                agent_id: property.agent_id,
                title: property.title,
                location: location,
                city: property.city,
                state: property.state,
                address: property.address,
                price: property.price,
                property_type: property.property_type,
                photos: property.photos,
              },
              template: agent.fb_template,
              colorPrimary: agent.fb_brand_color_primary,
              colorSecondary: agent.fb_brand_color_secondary,
            }),
          });

          if (flyerResponse.ok) {
            const flyerData = await flyerResponse.json();
            flyerUrl = flyerData.imageUrl;
            
            console.log('✅ Flyer generado exitosamente:', flyerUrl);
            
            // Agregar el flyer como primera imagen
            imageUrls = [flyerUrl, ...imageUrls];
            
            await sendEvent({ message: '✅ Diseño generado', progress: 50 });
          } else {
            const errorData = await flyerResponse.json();
            console.error('❌ Error generando flyer:', errorData);
            console.error('Error generando flyer, continuando con imágenes originales');
            await sendEvent({ message: 'Continuando sin diseño IA...', progress: 50 });
          }
        } catch (flyerError) {
          console.error('❌ Error en generación de flyer:', flyerError);
          await sendEvent({ message: 'Continuando sin diseño IA...', progress: 50 });
        }
      } else {
        console.log('ℹ️ Generación de IA deshabilitada (fb_ai_enabled = false)');
        await sendEvent({ message: 'Omitiendo diseño IA', progress: 50 });
      }

      // 4. Construir mensaje mejorado
      const message = await buildFacebookMessage(property, agent, customFieldsMap);
      
      console.log('📝 Mensaje de Facebook construido:');
      console.log(message);

      const pageId = agent.facebook_page_id;
      const accessToken = agent.facebook_access_token;

      await sendEvent({ message: 'Subiendo imágenes a Facebook...', progress: 60 });

      // 5. Subir todas las imágenes
      const uploadedPhotoIds: string[] = [];
      
      for (let i = 0; i < imageUrls.length; i++) {
        const imageUrl = imageUrls[i];
        try {
          console.log(`📤 Subiendo imagen ${i + 1}/${imageUrls.length}: ${imageUrl}`);
          
          const uploadResponse = await fetch(
            `https://graph.facebook.com/v18.0/${pageId}/photos`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                url: imageUrl,
                published: false,
                access_token: accessToken,
              }),
            }
          );

          const uploadData = await uploadResponse.json();
          
          if (uploadData.error) {
            console.error(`❌ Error subiendo imagen ${i + 1}:`, uploadData.error);
            continue;
          }

          uploadedPhotoIds.push(uploadData.id);
          console.log(`✅ Imagen ${i + 1} subida: ${uploadData.id}`);
        } catch (uploadError) {
          console.error(`❌ Error en upload de imagen ${i + 1}:`, uploadError);
        }
      }

      if (uploadedPhotoIds.length === 0) {
        throw new Error('No se pudo subir ninguna imagen a Facebook');
      }

      console.log(`✅ Total de imágenes subidas: ${uploadedPhotoIds.length}`);

      await sendEvent({ message: 'Publicando en Facebook...', progress: 80 });

      // 6. Publicar el post
      const publishResponse = await fetch(
        `https://graph.facebook.com/v18.0/${pageId}/feed`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message,
            attached_media: uploadedPhotoIds.map(id => ({ media_fbid: id })),
            access_token: accessToken,
          }),
        }
      );

      const publishData = await publishResponse.json();

      if (publishData.error) {
        console.error('❌ Error publicando en Facebook:', publishData.error);
        throw new Error(publishData.error.message);
      }

      console.log('✅ Publicado en Facebook:', publishData.id);

      await sendEvent({ message: 'Guardando registro...', progress: 90 });

      // 7. Guardar registro
      const { error: insertError } = await supabaseAdmin.from('facebook_posts').insert({
        property_id: propertyId,
        agent_id: agent.id,
        facebook_post_id: publishData.id,
        flyer_url: flyerUrl,
        published_at: new Date().toISOString(),
      });

      if (insertError) {
        console.error('⚠️ Error guardando registro (no crítico):', insertError);
      }

      await sendEvent({ 
        message: '✅ ¡Publicado exitosamente!', 
        progress: 100,
        success: true,
        postUrl: `https://facebook.com/${publishData.id}`
      });

      console.log('🎉 Proceso completado exitosamente');

    } catch (error: any) {
      console.error('💥 Error en publicación:', error);
      await sendEvent({ error: error.message || 'Error al publicar', progress: 0 });
    } finally {
      try {
        await writer.close();
      } catch (err) {
        // Ignorar error de cierre
      }
    }
  })();

  return new NextResponse(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}