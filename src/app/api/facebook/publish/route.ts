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
 
async function buildFacebookMessage(
  property: any,
  agent: any,
  customFieldsMap: Map<string, string>,
  propertyLanguage: 'es' | 'en',
  currencySymbol: string
): Promise<string> {
  const translations = {
    es: {
      sale: '🎯 VENTA',
      rent: '🎯 ALQUILER',
      excellentOpportunity: 'Excelente oportunidad inmobiliaria',
      features: '✨ Características',
      whatsappCta: '📲 ¿Desea más información o coordinar una visita? Contácteme aquí:',
      waMessage: 'Hola, me interesa la propiedad: ',
      waDetails: '. Me gustaría recibir más información.',
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
      whatsappCta: '📲 Looking for more details or want to schedule a tour? Contact me here:',
      waMessage: 'Hello, I am interested in this property: ',
      waDetails: '. I would like to get more information.',
      yes: 'Yes',
      no: 'No',
      priceOnRequest: 'Price upon request',
      locationAvailable: 'Location available',
    },
  };
 
  const t = translations[propertyLanguage];
  const operationType = property.listing_type === 'rent' ? t.rent : t.sale;
 
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
 
  const locationParts = [property.city, property.state].filter(Boolean);
  const displayLocation = locationParts.length > 0
    ? locationParts.join(', ')
    : property.address || t.locationAvailable;
 
  const displayPrice = property.price
    ? `${currencySymbol}${Number(property.price).toLocaleString()}`
    : t.priceOnRequest;
 
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
 
  const agentName = agent.full_name || agent.name || 'Agente inmobiliario';
  const agentPhone = agent.phone || '';
  const cleanPhone = agentPhone.replace(/\D/g, '');
 
  let waLink = '';
  if (cleanPhone) {
    const customMessage = `${t.waMessage}${property.title}${t.waDetails}`;
    waLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(customMessage)}`;
  }
 
  const sanitizeTag = (str: string) => (str ? str.replace(/[^a-zA-Z0-9]/g, '') : '');
  const isEn = propertyLanguage === 'en';
  const marketTag = isEn ? '#CostaRicaRealEstate' : '#BienesRaicesCR';
  const lifestyleTag = isEn ? '#RealEstateInvestment' : '#InversionInmobiliaria';
  const operationTag = property.listing_type === 'rent'
    ? (isEn ? '#ForRent' : '#Alquiler')
    : (isEn ? '#ForSale' : '#Venta');
  const typeTag = property.property_type ? `#${sanitizeTag(property.property_type)}` : '';
  const cityTag = property.city ? `#${sanitizeTag(property.city)}` : '';
  const stateTag = property.state ? `#${sanitizeTag(property.state)}` : '';
  const tagsArray = [marketTag, operationTag, typeTag, cityTag, stateTag, lifestyleTag].filter(tag => tag && tag.length > 1);
  const tags = tagsArray.join(' ');
 
  return `
${operationType}
 
📝 ${shortDescription}
 
🏡 ${property.title}
 
📍 ${displayLocation}
 
💰 ${displayPrice}${customFieldsText}
 
${t.whatsappCta}
👤 ${agentName}
👉 ${waLink}
 
${tags}
  `.trim();
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
 
      const { data: agentPlan } = await supabaseAdmin
        .from('agents')
        .select('plan, role, expires_at')
        .eq('email', userEmail)
        .single();
 
      const isProActivo =
        agentPlan?.role === 'admin' ||
        (agentPlan?.plan === 'pro' && !!agentPlan?.expires_at && new Date(agentPlan.expires_at) > new Date());
 
      if (!isProActivo) {
        await sendEvent({ error: '🔒 Esta función requiere un plan Pro activo.', progress: 0 });
        await writer.close();
        return;
      }
 
      console.log('🏠 Property ID recibido:', propertyId);
 
      // ← ÚNICO CAMBIO: postforme_account_id → facebook_account_id
      const { data: agent, error: agentError } = await supabaseAdmin
        .from('agents')
        .select('id, full_name, name, phone, facebook_account_id, fb_ai_enabled, fb_template, fb_brand_color_primary, fb_brand_color_secondary')
        .eq('email', userEmail)
        .single();
 
      if (agentError || !agent) {
        console.error('❌ Error obteniendo agente:', agentError);
        await sendEvent({ error: 'Agente no encontrado', progress: 0 });
        await writer.close();
        return;
      }
 
      console.log('✅ Agent obtenido correctamente:', agent.id);
 
      // ← ÚNICO CAMBIO: postforme_account_id → facebook_account_id
      if (!agent.facebook_account_id) {
        await sendEvent({ error: 'Facebook no conectado', progress: 0 });
        await writer.close();
        return;
      }
 
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
 
      let currencySymbol = '$';
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
 
      const propertyLanguage = property.language || 'es';
      console.log(`🌐 Idioma de la propiedad: ${propertyLanguage}`);
 
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
 
      let imageUrls: string[] = property.photos || [];
      if (imageUrls.length === 0) {
        await sendEvent({ error: 'La propiedad no tiene imágenes', progress: 0 });
        await writer.close();
        return;
      }
 
      console.log(`✅ Imágenes encontradas: ${imageUrls.length}`);
 
      let flyerUrl: string | null = null;
 
      if (agent.fb_ai_enabled) {
        await sendEvent({ message: '🎨 Generando diseño con IA...', progress: 30 });
        try {
          const locationParts = [property.city, property.state].filter(Boolean);
          const location = locationParts.length > 0 ? locationParts.join(', ') : property.address || 'Ubicación disponible';
          console.log('📤 Enviando datos a generate-flyer:', {
            propertyId: property.id,
            hasPhotos: property.photos?.length || 0,
            firstPhoto: property.photos?.[0] || 'none',
          });
          const flyerResponse = await fetch(`${APP_DOMAIN}/api/openai/generate-flyer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              property: {
                id: property.id,
                agent_id: property.agent_id,
                title: property.title,
                location,
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
            imageUrls = [flyerUrl, ...imageUrls];
            await sendEvent({ message: '✅ Diseño generado', progress: 50 });
          } else {
            const errorData = await flyerResponse.json();
            console.error('❌ Error generando flyer:', errorData);
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
 
      const message = await buildFacebookMessage(property, agent, customFieldsMap, propertyLanguage, currencySymbol);
      console.log('📝 Mensaje de Facebook construido:');
      console.log(message);
 
      await sendEvent({ message: 'Publicando en Facebook...', progress: 60 });
 
      // ← ÚNICO CAMBIO: agent.postforme_account_id → agent.facebook_account_id
      const post = await publishViaPostForMe(
        agent.facebook_account_id,
        message,
        imageUrls
      );
 
      console.log('✅ Publicado via Post for Me:', post.id);
 
      await sendEvent({ message: 'Guardando registro...', progress: 90 });
 
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
        postUrl: post.id ? `https://facebook.com/${post.id}` : null,
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