import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { supabaseAdmin } from '@/lib/supabase';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { postId, property_type, listing_type, language, custom_fields } = await req.json();

    if (!postId) {
      return NextResponse.json({ error: 'postId requerido' }, { status: 400 });
    }

    // Obtener agente
    const { data: agent, error: agentError } = await supabaseAdmin
      .from('agents')
      .select('id, facebook_access_token')
      .eq('email', session.user.email)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agente no encontrado' }, { status: 404 });
    }

    if (!agent.facebook_access_token) {
      return NextResponse.json(
        { error: 'No hay página de Facebook vinculada' },
        { status: 400 }
      );
    }

    console.log('📥 Importando post:', postId);

    // 1. OBTENER DETALLES COMPLETOS DEL POST
    const postResponse = await fetch(
      `https://graph.facebook.com/v18.0/${postId}?` +
      `fields=message,attachments{media,subattachments{media}}` +
      `&access_token=${agent.facebook_access_token}`
    );

    if (!postResponse.ok) {
      const errorData = await postResponse.json();
      throw new Error(errorData.error?.message || 'Error al obtener post de Facebook');
    }

    const postData = await postResponse.json();

    // 2. EXTRAER TEXTO
    const text = postData.message || '';

    if (!text || text.trim().length < 50) {
      return NextResponse.json(
        { error: 'El post no tiene suficiente texto (mínimo 50 caracteres)' },
        { status: 400 }
      );
    }

    console.log('📝 Texto extraído:', text.substring(0, 100) + '...');

    // 3. EXTRAER URLs DE IMÁGENES EN ALTA RESOLUCIÓN
    const fbImageUrls: string[] = [];
    
    if (postData.attachments?.data) {
      for (const attachment of postData.attachments.data) {
        // Imagen principal
        if (attachment.media?.image?.src) {
          fbImageUrls.push(attachment.media.image.src);
        }
        
        // Subattachments (álbumes con múltiples fotos)
        if (attachment.subattachments?.data) {
          for (const sub of attachment.subattachments.data) {
            if (sub.media?.image?.src) {
              fbImageUrls.push(sub.media.image.src);
            }
          }
        }
      }
    }

    if (fbImageUrls.length === 0) {
      return NextResponse.json(
        { error: 'El post no tiene imágenes' },
        { status: 400 }
      );
    }

    console.log(`📸 ${fbImageUrls.length} imágenes encontradas`);

    // 4. DESCARGAR IMÁGENES DE FACEBOOK Y SUBIR A SUPABASE
    console.log('📥 Descargando imágenes de Facebook...');
    
    const timestamp = Date.now();
    const tempSlug = `fb-import-${timestamp}`;
    const uploadedImageUrls: string[] = [];

    for (let i = 0; i < fbImageUrls.length; i++) {
      const fbUrl = fbImageUrls[i];
      
      try {
        console.log(`📥 Descargando imagen ${i + 1}/${fbImageUrls.length}...`);

        // Fetch de la imagen desde Facebook
        const imageResponse = await fetch(fbUrl);

        if (!imageResponse.ok) {
          console.warn(`⚠️ No se pudo descargar imagen ${i + 1}`);
          continue;
        }

        // Convertir a buffer
        const arrayBuffer = await imageResponse.arrayBuffer();
        const buffer = new Uint8Array(arrayBuffer);

        // Generar nombre único
        const fileName = `${agent.id}/${tempSlug}/img-${i}.jpg`;

        // Subir a Supabase Storage
        const { data, error } = await supabaseAdmin.storage
          .from('property-photos')
          .upload(fileName, buffer, {
            contentType: 'image/jpeg',
            cacheControl: '3600',
            upsert: false,
          });

        if (error) {
          console.error(`❌ Error subiendo imagen ${i + 1}:`, error);
          continue;
        }

        // Obtener URL pública
        const { data: publicUrlData } = supabaseAdmin.storage
          .from('property-photos')
          .getPublicUrl(fileName);

        uploadedImageUrls.push(publicUrlData.publicUrl);
        console.log(`✅ Imagen ${i + 1} subida a Supabase`);

      } catch (err) {
        console.error(`❌ Error procesando imagen ${i + 1}:`, err);
        continue;
      }
    }

    if (uploadedImageUrls.length === 0) {
      return NextResponse.json(
        { error: 'No se pudo descargar ninguna imagen' },
        { status: 500 }
      );
    }

    console.log(`✅ ${uploadedImageUrls.length}/${fbImageUrls.length} imágenes descargadas`);

    // 5. PROCESAR TEXTO CON IA (reutilizar lógica de /api/property/generate)
    console.log('🤖 Procesando texto con IA...');
    
    const propertyData = await processTextWithAI(
      text,
      property_type,
      listing_type,
      language,
      custom_fields || []
    );

    console.log('✅ Datos extraídos por IA:', propertyData);

    // 6. RETORNAR DATOS COMPLETOS
    return NextResponse.json({
      success: true,
      property: {
        ...propertyData,
        photos: uploadedImageUrls, // URLs de Supabase
      },
      imageCount: uploadedImageUrls.length,
      source: 'facebook_import',
    });

  } catch (error: any) {
    console.error('❌ Error importando post:', error);
    return NextResponse.json(
      { error: error.message || 'Error al importar post de Facebook' },
      { status: 500 }
    );
  }
}

// Helper: Procesar texto con IA (copiar de /api/property/generate)
async function processTextWithAI(
  text: string,
  property_type: string,
  listing_type: string,
  language: 'es' | 'en',
  custom_fields: any[]
): Promise<any> {

  const systemPrompt = buildPrompt(language, custom_fields);

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.7,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: text },
    ],
  });

  const responseText = completion.choices[0].message.content;
  if (!responseText) {
    throw new Error('No se recibió respuesta de IA');
  }

  const property = JSON.parse(responseText);

  return {
    title: property.title || 'Propiedad importada',
    description: property.description || text,
    price: property.price || null,
    address: property.address || '',
    city: property.city || '',
    state: property.state || '',
    zip_code: property.zip_code || '',
    custom_fields_data: property.custom_fields_data || {},
  };
}

// Helper: Construir prompt (adaptado de /api/property/generate)
function buildPrompt(language: 'es' | 'en', customFields: any[]): string {
  if (language === 'en') {
    // ENGLISH PROMPT
    const customFieldsSection = customFields.length > 0 
      ? `\n\n4. CUSTOM FIELDS (IMPORTANT - Read carefully):

AVAILABLE FIELDS LIST:
${customFields.map(f => `   ${f.icon} "${f.field_name_en || f.field_name}" [key: ${f.field_key}]
      - Type: ${f.field_type === 'number' ? 'NUMBER (digits only)' : 'TEXT (short answers like: Yes, No, or brief description)'}
      - Placeholder: "${f.placeholder}"
      - Example: ${f.field_type === 'number' ? '"2" (if mentions "two water sources")' : '"Yes" (if they have it), "No" (if they don\'t), or brief description'}`).join('\n\n')}

CRITICAL RULES FOR CUSTOM FIELDS:
1. ✅ ONLY include in "custom_fields_data" the fields mentioned in the post
2. ❌ DO NOT use the field name as value (example: DON'T do "garage": "Garage")
3. ✅ For TEXT fields about existence/presence:
   - If post says YES they have it: use "Yes" or "Available"
   - If post says NO they don't have it: use "No" or "Not available"
   - If post gives details: use brief description (max 50 characters)
4. ✅ For NUMBER fields:
   - Extract ONLY the number mentioned
   - "two water sources" → "2"
   - "three lakes" → "3"
   - If no quantity specified: omit the field
5. ✅ Use the "field_key" (not "field_name") as key in JSON
6. ❌ If the post did NOT mention a field, do NOT include it in custom_fields_data`
      : '';

    return `You are an expert in real estate copywriting and structured information extraction.

You're analyzing a Facebook post about a property. Your job is:

1. EXTRACT all structured information mentioned:
   - Price (if mentioned)
   - Complete location (address, city, state/province, zip code)
   - Outstanding features

2. GENERATE a professional and attractive description IN ENGLISH:
   - Catchy title (max 80 characters)
   - Complete description (250-300 words)
   - Tone: professional but warm and welcoming
   - Focused on benefits and lifestyle
   - Highlight unique features
   - Include relevant keywords for SEO

3. RESPONSE FORMAT (valid JSON):
{
  "title": "Beautiful 3BR Home in Downtown Austin",
  "description": "Discover your dream home in the heart of downtown...",
  "price": 450000,
  "address": "123 Main Street",
  "city": "Austin",
  "state": "TX",
  "zip_code": "78701"${customFields.length > 0 ? ',\n  "custom_fields_data": {\n    "example_field": "Yes"\n  }' : ''}
}${customFieldsSection}

CRITICAL RULES FOR PRICE:
⚠️ IMPORTANT: The price must be the COMPLETE number without symbols, spaces, or commas.

CONVERSION FROM COLLOQUIAL LANGUAGE TO NUMBERS:
1. ✅ "thousand" = 1,000 (three zeros)
   - "200 thousand" → 200000
   - "500 thousand" → 500000
   - "850 thousand" → 850000

2. ✅ "million/millions" = 1,000,000 (six zeros)
   - "2 million" → 2000000
   - "3.5 million" → 3500000
   - "15 million" → 15000000

3. ✅ Combinations:
   - "1 million 200 thousand" → 1200000
   - "2.8 million" → 2800000
   - "half million" → 500000

4. ✅ Ignore mentioned currency (dollars/colones/CRC/USD):
   - "70 million dollars" → 70000000
   - "3 million colones" → 3000000
   - "400 thousand USD" → 400000
   - "100 million CRC" → 100000000

5. ✅ If no price mentioned or says "by consultation" → use null

GENERAL RULES:
- If post did NOT mention some basic data, use null
- Price must be number WITHOUT symbols, commas, spaces or text
- Currency is already configured in system, do NOT include it in price
- "state" can be state or province (equivalent)
- Description must be fluid, not a list of features
- DO NOT invent information that wasn't mentioned

Facebook post text:`;
  } else {
    // SPANISH PROMPT
    const customFieldsSection = customFields.length > 0 
      ? `\n\n4. CAMPOS PERSONALIZADOS (IMPORTANTE - Lee con atención):

LISTA DE CAMPOS DISPONIBLES:
${customFields.map(f => `   ${f.icon} "${f.field_name}" [key: ${f.field_key}]
      - Tipo: ${f.field_type === 'number' ? 'NÚMERO (solo dígitos)' : 'TEXTO (respuestas cortas como: Sí, No, o descripción breve)'}
      - Placeholder: "${f.placeholder}"
      - Ejemplo: ${f.field_type === 'number' ? '"2" (si menciona "dos nacientes")' : '"Sí" (si dice que tiene), "No" (si dice que no tiene), o descripción breve'}`).join('\n\n')}

REGLAS CRÍTICAS PARA CAMPOS PERSONALIZADOS:
1. ✅ SOLO incluye en "custom_fields_data" los campos que se mencionan en el post
2. ❌ NO uses el nombre del campo como valor (ejemplo: NO hacer "garaje": "Garaje")
3. ✅ Para campos de TEXTO sobre existencia/presencia:
   - Si el post dice que SÍ tiene: usa "Sí" o "Disponible"
   - Si el post dice que NO tiene: usa "No" o "No disponible"
   - Si el post da detalles: usa la descripción breve (máximo 50 caracteres)
4. ✅ Para campos NUMÉRICOS:
   - Extrae SOLO el número mencionado
   - "dos nacientes" → "2"
   - "tres lagos" → "3"
   - Si no especifica cantidad: omite el campo
5. ✅ Usa el "field_key" (no el "field_name") como llave en el JSON
6. ❌ Si el post NO mencionó un campo, NO lo incluyas en custom_fields_data`
      : '';

    return `Eres un experto en copywriting de bienes raíces y extracción de información estructurada.

Estás analizando un post de Facebook sobre una propiedad. Tu trabajo es:

1. EXTRAER toda la información estructurada que se menciona:
   - Precio (si se menciona)
   - Ubicación completa (dirección, ciudad, estado/provincia, código postal)
   - Características destacadas

2. GENERAR una descripción profesional y atractiva EN ESPAÑOL:
   - Título llamativo (máximo 80 caracteres)
   - Descripción completa (250-300 palabras)
   - Tono: profesional pero cálido y acogedor
   - Enfocado en beneficios y estilo de vida
   - Resalta las características únicas
   - Incluye keywords relevantes para SEO

3. FORMATO de respuesta (JSON válido):
{
  "title": "Hermosa Casa de 3 Habitaciones en Centro",
  "description": "Descubre la casa de tus sueños en el corazón del centro...",
  "price": 450000,
  "address": "Calle Principal 123",
  "city": "San José",
  "state": "San José",
  "zip_code": "10101"${customFields.length > 0 ? ',\n  "custom_fields_data": {\n    "campo_ejemplo": "Sí"\n  }' : ''}
}${customFieldsSection}

REGLAS CRÍTICAS PARA EL PRECIO:
⚠️ IMPORTANTE: El precio debe ser el número COMPLETO sin símbolos, espacios ni comas.

CONVERSIÓN DE LENGUAJE COLOQUIAL A NÚMEROS:
1. ✅ "mil" = 1,000 (tres ceros)
   - "200 mil" → 200000
   - "500 mil" → 500000
   - "850 mil" → 850000

2. ✅ "millón/millones" = 1,000,000 (seis ceros)
   - "2 millones" → 2000000
   - "3.5 millones" → 3500000
   - "15 millones" → 15000000

3. ✅ Combinaciones:
   - "1 millón 200 mil" → 1200000
   - "2.8 millones" → 2800000
   - "medio millón" → 500000

4. ✅ Ignora la divisa mencionada (dólares/colones/CRC/USD):
   - "70 millones de dólares" → 70000000
   - "3 millones de colones" → 3000000
   - "400 mil USD" → 400000
   - "100 millones CRC" → 100000000

5. ✅ Si no menciona precio o dice "a consultar" → usa null

REGLAS GENERALES:
- Si el post NO menciona algún dato básico, usa null
- El precio debe ser número SIN símbolos, comas, espacios ni texto
- La divisa ya está configurada en el sistema, NO la incluyas en el precio
- "state" puede ser estado o provincia (son equivalentes)
- La descripción debe ser fluida, no una lista de características
- NO inventes información que no fue mencionada

Texto del post de Facebook:`;
  }
}