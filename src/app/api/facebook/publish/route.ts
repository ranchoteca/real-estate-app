import { NextRequest, NextResponse } from 'next/server';
import { publishViaPostForMe } from '@/lib/facebook';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { supabaseAdmin } from '@/lib/supabase';

// ✅ DOMINIO PRINCIPAL - Cambiar aquí si usas otro dominio
const APP_DOMAIN = 'https://flowestateai.com';

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
async function buildFacebookMessage(
  property: any, 
  agent: any, 
  customFieldsMap: Map<string, string>, 
  propertyLanguage: 'es' | 'en',
  currencySymbol: string
): Promise<string> {
  // Traducciones según idioma de la propiedad
  const translations = {
    es: {
      sale: '🎯 VENTA',
      rent: '🎯 ALQUILER',
      excellentOpportunity: 'Excelente oportunidad inmobiliaria',
      features: '✨ Características',
      whatsappCta: '📲 Escríbame directo al WhatsApp para enviarle la galería completa y el precio:',
      yes: 'Sí',
      no: 'No',
      priceOnRequest: 'Precio a consultar',
      locationAvailable: 'Ubicación disponible',
    },
    en: {
      sale: '🎯 FOR SALE',
      rent: '🎯 FOR RENT',
      excellentOpportunity: 'Excellent real estate opportunity',
      features: '✨ Features',
      whatsappCta: '📲 Contact me directly on WhatsApp for the full gallery and pricing:',
      yes: 'Yes',
      no: 'No',
      priceOnRequest: 'Price upon request',
      locationAvailable: 'Location available',
    }
  };

  const t = translations[propertyLanguage];
  
  // 1. Tipo de operación
  const operationType = property.listing_type === 'rent' ? t.rent : t.sale;
  
  // 2. Descripción corta inteligente (primeras 2 oraciones completas)
  let shortDescription = t.excellentOpportunity;
  if (property.description) {
    const sentences = property.description
      .split(/\.(?=\s|$)/)
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0);

    if (sentences.length >= 2) {
      shortDescription = sentences[0] + '. ' + sentences[1] + '.';
    } else if (sentences.length === 1) {
      shortDescription = sentences[0] + '.';
    } else {
      shortDescription = property.description.substring(0, 150).trim();
      if (property.description.length > 150) shortDescription += '...';
    }
  }
  
  // 3. Ubicación
  const locationParts = [property.city, property.state].filter(Boolean);
  const displayLocation = locationParts.length > 0 
    ? locationParts.join(', ') 
    : property.address || t.locationAvailable;
  
  // 4. Precio formateado
  const displayPrice = property.price 
    ? `${currencySymbol}${Number(property.price).toLocaleString()}` 
    : t.priceOnRequest;
  
  // 5. Campos personalizados
  let customFieldsText = '';
  if (property.custom_fields_data && typeof property.custom_fields_data === 'object') {
    const fields = Object.entries(property.custom_fields_data)
      .filter(([_, value]) => value !== null && value !== undefined && value !== '')
      .map(([fieldKey, value]) => {
        const fieldName = customFieldsMap.get(fieldKey) || fieldKey;
        let displayValue: string = typeof value === 'boolean' ? (value ? t.yes : t.no) : String(value);
        return `✅ ${fieldName}: ${displayValue}`;
      });

    if (fields.length > 0) {
      customFieldsText = '\n\n' + t.features + '\n' + fields.join('\n');
    }
  }
  
  // 6. Configurar Nombre del Agente y Enlace de WhatsApp
  const agentName = agent.full_name || agent.name || 'Agente inmobiliario';
  const agentPhone = agent.phone || '';
  
  // Limpiar el número de teléfono para la URL (elimina espacios, guiones, conserva solo números)
  const cleanPhone = agentPhone.replace(/\D/g, ''); 
  const waLink = cleanPhone ? `https://wa.me/${cleanPhone}` : '';
  
  // 7. Generación Dinámica de Tags (sin necesidad de IA externa)
  const sanitizeTag = (str: string) => str.replace(/[^a-zA-Z0-9]/g, '');
  
  const baseTag = propertyLanguage === 'en' ? '#RealEstate' : '#BienesRaicesCostaRica';
  const operationTag = property.listing_type === 'rent' 
    ? (propertyLanguage === 'en' ? '#ForRent' : '#Alquiler') 
    : (propertyLanguage === 'en' ? '#ForSale' : '#Venta');
  const typeTag = property.property_type ? `#${sanitizeTag(property.property_type)}` : '';
  const cityTag = property.city ? `#${sanitizeTag(property.city)}` : '';
  
  // Unir los tags válidos y eliminar espacios extra
  const tags = [baseTag, operationTag, typeTag, cityTag, '#InversionesInmobiliarias']
    .filter(Boolean)
    .join(' ');

  // 8. Construir mensaje final sin URLs externas
  const message = `
${operationType}

📝 ${shortDescription}

🏡 ${property.title}

📍 ${displayLocation}

💰 ${displayPrice}${customFieldsText}

${t.whatsappCta}
👤 ${agentName}
${waLink ? `👉 ${waLink}` : (agentPhone ? `📱 ${agentPhone}` : '')}

${tags}
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
        .select('id, username, full_name, name, phone, postforme_account_id, fb_ai_enabled, fb_brand_color_primary, fb_brand_color_secondary, fb_template')
        .eq('email', userEmail)
        .single();

      if (agentError || !agent) {
        console.error('❌ Error obteniendo agente:', agentError);
        await sendEvent({ error: 'Agente no encontrado', progress: 0 });
        await writer.close();
        return;
      }

      console.log('✅ Agent obtenido correctamente:', agent.id);

      if (!agent.postforme_account_id) {
        await sendEvent({ error: 'Facebook no conectado', progress: 0 });
        await writer.close();
        return;
      }

      // 2. Obtener propiedad (agregamos listing_type, slug, custom_fields_data, currency_id, language)
      const { data: property, error: propertyError } = await supabaseAdmin
        .from('properties')
        .select('id, title, description, price, city, state, address, photos, agent_id, property_type, listing_type, slug, custom_fields_data, language, currency_id')
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
      console.log('💱 Currency ID:', property.currency_id);

      // 2.1 Obtener el símbolo de la divisa
      let currencySymbol = '$'; // Default: dólar
      if (property.currency_id) {
        const { data: currency, error: currencyError } = await supabaseAdmin
          .from('currencies')
          .select('symbol')
          .eq('id', property.currency_id)
          .single();
        
        if (!currencyError && currency) {
          currencySymbol = currency.symbol;
          console.log('✅ Símbolo de divisa obtenido:', currencySymbol);
        } else {
          console.log('⚠️ No se pudo obtener divisa, usando $ por defecto');
        }
      } else {
        console.log('⚠️ Propiedad sin currency_id, usando $ por defecto');
      }

      // ✅ IMPORTANTE: Detectar idioma PRIMERO antes de obtener custom fields
      const propertyLanguage = property.language || 'es';
      console.log(`🌐 Idioma de la propiedad: ${propertyLanguage}`);

      // 2.2 Obtener los nombres reales de los custom fields EN EL IDIOMA CORRECTO
      const customFieldsMap = new Map<string, string>();

      if (property.custom_fields_data && Object.keys(property.custom_fields_data).length > 0) {
        const fieldKeys = Object.keys(property.custom_fields_data);
        
        console.log('🔍 Buscando nombres de campos personalizados:', fieldKeys);
        
        const { data: customFields, error: fieldsError } = await supabaseAdmin
          .from('custom_fields')
          .select('field_key, field_name, field_name_en')
          .in('field_key', fieldKeys);
        
        if (!fieldsError && customFields) {
          customFields.forEach(field => {
            // ✅ Usar field_name_en si la propiedad está en inglés, sino usar field_name
            const fieldName = propertyLanguage === 'en' && field.field_name_en 
              ? field.field_name_en 
              : field.field_name;
            
            customFieldsMap.set(field.field_key, fieldName);
          });
          console.log(`✅ Nombres de campos obtenidos en ${propertyLanguage}:`, Object.fromEntries(customFieldsMap));
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

          // ✅ USANDO DOMINIO PERSONALIZADO PARA LA API DE FLYER
          const flyerResponse = await fetch(`${APP_DOMAIN}/api/openai/generate-flyer`, {
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

      // ✅ Construir mensaje con el símbolo de divisa correcto
      const message = await buildFacebookMessage(property, agent, customFieldsMap, propertyLanguage, currencySymbol);
      
      console.log('📝 Mensaje de Facebook construido:');
      console.log(message);

      await sendEvent({ message: 'Publicando en Facebook...', progress: 60 });

      const post = await publishViaPostForMe(
        agent.postforme_account_id,
        message,
        imageUrls
      );

      console.log('✅ Publicado via Post for Me:', post.id);

      await sendEvent({ message: 'Guardando registro...', progress: 90 });

      // 7. Guardar registro
      const { error: insertError } = await supabaseAdmin.from('facebook_posts').insert({
        property_id: propertyId,
        agent_id: agent.id,
        facebook_post_id: post.id,
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
        postUrl: post.id ? `https://facebook.com/${post.id}` : null
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