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

      // 1. Obtener datos del agente
      const { data: agent, error: agentError } = await supabaseAdmin
        .from('agents')
        .select('id, facebook_page_id, facebook_access_token, fb_ai_enabled, fb_brand_color_primary, fb_brand_color_secondary, fb_template')
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

      // 2. Obtener propiedad (con el campo photos que es un ARRAY)
      const { data: property, error: propertyError } = await supabaseAdmin
        .from('properties')
        .select('id, title, description, price, city, state, address, photos, agent_id, property_type')
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
                id: property.id,              // ✅ AGREGADO
                agent_id: property.agent_id,  // ✅ AGREGADO
                title: property.title,
                location: location,
                city: property.city,           // ✅ AGREGADO
                state: property.state,         // ✅ AGREGADO
                address: property.address,     // ✅ AGREGADO
                price: property.price,
                property_type: property.property_type, // ✅ AGREGADO
                photos: property.photos,       // ✅ AGREGADO - LO MÁS IMPORTANTE
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
        await sendEvent({ message: 'Omitiendo diseño IA', progress: 50 });
      }

      // 4. Preparar mensaje
      const locationParts = [property.city, property.state].filter(Boolean);
      const displayLocation = locationParts.length > 0 ? locationParts.join(', ') : property.address || 'Ubicación disponible';

      const message = `
🏡 ${property.title}

📍 ${displayLocation}
💰 ${property.price ? `$${Number(property.price).toLocaleString()}` : 'Consultar precio'}

${property.description || ''}

📞 ¡Contáctame para más información!
      `.trim();

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