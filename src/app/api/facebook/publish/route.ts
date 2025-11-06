import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const propertyId = req.nextUrl.searchParams.get('propertyId');
  
  if (!propertyId) {
    return NextResponse.json({ error: 'propertyId requerido' }, { status: 400 });
  }

  // Llamar directamente a la función de procesamiento
  return handlePublish(propertyId);
}

export async function POST(req: NextRequest) {
  const { propertyId } = await req.json();
  
  if (!propertyId) {
    return NextResponse.json({ error: 'propertyId requerido' }, { status: 400 });
  }

  return handlePublish(propertyId);
}

// Función compartida que maneja la publicación
function handlePublish(propertyId: string) {
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // Función helper para enviar eventos SSE
  const sendEvent = async (data: any) => {
    try {
      await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
    } catch (err) {
      console.error('Error enviando evento SSE:', err);
    }
  };

  // Procesar en background
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

      // 2. Obtener propiedad
      const { data: property, error: propertyError } = await supabaseAdmin
        .from('properties')
        .select('*, property_images(*)')
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

      let imageUrls = property.property_images?.map((img: any) => img.url) || [];
      
      if (imageUrls.length === 0) {
        await sendEvent({ error: 'La propiedad no tiene imágenes', progress: 0 });
        await writer.close();
        return;
      }

      let flyerUrl = null;

      // 3. Generar flyer con IA si está habilitado
      if (agent.fb_ai_enabled) {
        await sendEvent({ message: '🎨 Generando diseño con IA...', progress: 30 });

        const flyerResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/openai/generate-flyer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            property: {
              title: property.title,
              location: property.location,
              price: property.price,
            },
            template: agent.fb_template,
            colorPrimary: agent.fb_brand_color_primary,
            colorSecondary: agent.fb_brand_color_secondary,
          }),
        });

        if (flyerResponse.ok) {
          const flyerData = await flyerResponse.json();
          flyerUrl = flyerData.imageUrl;
          
          // Agregar el flyer como primera imagen
          imageUrls = [flyerUrl, ...imageUrls];
          
          await sendEvent({ message: '✅ Diseño generado', progress: 50 });
        } else {
          console.error('Error generando flyer, continuando con imágenes originales');
          await sendEvent({ message: 'Continuando sin diseño IA...', progress: 50 });
        }
      } else {
        await sendEvent({ message: 'Omitiendo diseño IA', progress: 50 });
      }

      // 4. Preparar mensaje
      const message = `
🏡 ${property.title}

📍 ${property.location || 'Ubicación disponible'}
💰 ${property.price ? `$${property.price.toLocaleString()}` : 'Consultar precio'}

${property.description || ''}

📞 ¡Contáctame para más información!
      `.trim();

      const pageId = agent.facebook_page_id;
      const accessToken = agent.facebook_access_token;

      await sendEvent({ message: 'Subiendo imágenes a Facebook...', progress: 60 });

      // 5. Subir todas las imágenes
      const uploadedPhotoIds = await Promise.all(
        imageUrls.map(async (imageUrl: string) => {
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
            throw new Error(`Error subiendo imagen: ${uploadData.error.message}`);
          }

          return uploadData.id;
        })
      );

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
        throw new Error(publishData.error.message);
      }

      await sendEvent({ message: 'Guardando registro...', progress: 90 });

      // 7. Guardar registro
      await supabaseAdmin.from('facebook_posts').insert({
        property_id: propertyId,
        agent_id: agent.id,
        facebook_post_id: publishData.id,
        flyer_url: flyerUrl,
        published_at: new Date().toISOString(),
      });

      await sendEvent({ 
        message: '✅ ¡Publicado exitosamente!', 
        progress: 100,
        success: true,
        postUrl: `https://facebook.com/${publishData.id}`
      });

    } catch (error: any) {
      console.error('💥 Error en publicación:', error);
      await sendEvent({ error: error.message || 'Error al publicar', progress: 0 });
    } finally {
      try {
        await writer.close();
      } catch (err) {
        console.error('Error cerrando writer:', err);
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