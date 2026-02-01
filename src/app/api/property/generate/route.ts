import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface CustomField {
  field_key: string;   
  field_name: string;
  field_name_en : string;
  field_type: 'text' | 'number';
  placeholder: string;
  icon: string;
}

function buildPropertyPrompt(language: 'es' | 'en', customFields: CustomField[] = []): string {
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
1. ✅ ONLY include in "custom_fields_data" the fields the agent DID mention
2. ❌ DO NOT use the field name as value (example: DON'T do "garage": "Garage")
3. ✅ For TEXT fields about existence/presence:
   - If they say YES they have it: use "Yes" or "Available"
   - If they say NO they don't have it: use "No" or "Not available"
   - If they give details: use brief description (max 50 characters)
4. ✅ For NUMBER fields:
   - Extract ONLY the number mentioned
   - "two water sources" → "2"
   - "three lakes" → "3"
   - If no quantity specified: omit the field
5. ✅ Use the "field_key" (not "field_name") as key in JSON
6. ❌ If the agent did NOT mention a field, do NOT include it in custom_fields_data

CORRECT EXAMPLES:
- Agent says: "has garage for two cars" 
  → "garage": "Yes - 2 cars" (text field)

- Agent says: "has perimeter fence"
  → "perimeter_fence": "Yes" (text field)

- Agent says: "no terrace"
  → "terrace": "No" (text field)

- Agent says: "there are three water sources on the property"
  → "water_sources": "3" (number field)

- Agent does NOT mention "lakes"
  → DO NOT include "lakes" in custom_fields_data

INCORRECT EXAMPLES ❌:
- "garage": "Garage" → WRONG (uses name as value)
- "perimeter_fence": "Perimeter fence" → WRONG (uses name as value)
- "water_sources": "water_sources" → WRONG (uses name as value)
- Including unmentioned fields → WRONG`
      : '';

    return `You are an expert in real estate copywriting and structured information extraction.

A real estate agent just described a property by voice. Your job is:

1. EXTRACT all structured information they mentioned:
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

CONVERSION EXAMPLES:
- "the price is 2 million dollars" → "price": 2000000
- "worth 400 thousand dollars" → "price": 400000
- "costs 70 million" → "price": 70000000
- "3 and a half million colones" → "price": 3500000
- "one hundred million colones" → "price": 100000000
- "850 thousand USD" → "price": 850000
- "price by consultation" → "price": null
- "call for price" → "price": null

GENERAL RULES:
- If agent did NOT mention some basic data, use null
- Price must be number WITHOUT symbols, commas, spaces or text
- Currency is already configured in system, do NOT include it in price
- "state" can be state or province (equivalent)
- Description must be fluid, not a list of features
- DO NOT invent information that wasn't mentioned

Agent's transcription:`;
  } else {
    // SPANISH PROMPT (original)
    const customFieldsSection = customFields.length > 0 
      ? `\n\n4. CAMPOS PERSONALIZADOS (IMPORTANTE - Lee con atención):

LISTA DE CAMPOS DISPONIBLES:
${customFields.map(f => `   ${f.icon} "${f.field_name}" [key: ${f.field_key}]
      - Tipo: ${f.field_type === 'number' ? 'NÚMERO (solo dígitos)' : 'TEXTO (respuestas cortas como: Sí, No, o descripción breve)'}
      - Placeholder: "${f.placeholder}"
      - Ejemplo: ${f.field_type === 'number' ? '"2" (si menciona "dos nacientes")' : '"Sí" (si dice que tiene), "No" (si dice que no tiene), o descripción breve'}`).join('\n\n')}

REGLAS CRÍTICAS PARA CAMPOS PERSONALIZADOS:
1. ✅ SOLO incluye en "custom_fields_data" los campos que el agente SÍ mencionó
2. ❌ NO uses el nombre del campo como valor (ejemplo: NO hacer "garaje": "Garaje")
3. ✅ Para campos de TEXTO sobre existencia/presencia:
   - Si dice que SÍ tiene: usa "Sí" o "Disponible"
   - Si dice que NO tiene: usa "No" o "No disponible"
   - Si da detalles: usa la descripción breve (máximo 50 caracteres)
4. ✅ Para campos NUMÉRICOS:
   - Extrae SOLO el número mencionado
   - "dos nacientes" → "2"
   - "tres lagos" → "3"
   - Si no especifica cantidad: omite el campo
5. ✅ Usa el "field_key" (no el "field_name") como llave en el JSON
6. ❌ Si el agente NO mencionó un campo, NO lo incluyas en custom_fields_data

EJEMPLOS CORRECTOS:
- Agente dice: "tiene garaje para dos carros" 
  → "garaje": "Sí - 2 carros" (campo texto)

- Agente dice: "cuenta con malla perimetral"
  → "malla_perimetral": "Sí" (campo texto)

- Agente dice: "no tiene terraza"
  → "terraza": "No" (campo texto)

- Agente dice: "hay tres nacientes en la propiedad"
  → "nacientes": "3" (campo número)

- Agente NO menciona "lagos"
  → NO incluir "lagos" en custom_fields_data

EJEMPLOS INCORRECTOS ❌:
- "garaje": "Garaje" → MAL (usa el nombre como valor)
- "malla_perimetral": "Malla perimetral" → MAL (usa el nombre como valor)
- "nacientes": "nacientes" → MAL (usa el nombre como valor)
- Incluir campos no mencionados → MAL`
      : '';

    return `Eres un experto en copywriting de bienes raíces y extracción de información estructurada.

Un agente inmobiliario acaba de describir una propiedad por voz. Tu trabajo es:

1. EXTRAER toda la información estructurada que mencionó:
   - Precio (si lo mencionó)
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
  "title": "Beautiful 3BR Home in Downtown Austin",
  "description": "Discover your dream home in the heart of downtown...",
  "price": 450000,
  "address": "123 Main Street",
  "city": "Austin",
  "state": "TX",
  "zip_code": "78701"${customFields.length > 0 ? ',\n  "custom_fields_data": {\n    "campo_ejemplo": "Sí"\n  }' : ''}
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

EJEMPLOS DE CONVERSIÓN:
- "el precio es de 2 millones de dólares" → "price": 2000000
- "vale 400 mil dólares" → "price": 400000
- "cuesta 70 millones" → "price": 70000000
- "3 millones y medio de colones" → "price": 3500000
- "cien millones de colones" → "price": 100000000
- "850 mil USD" → "price": 850000
- "precio a consultar" → "price": null
- "llamar para precio" → "price": null

REGLAS GENERALES:
- Si el agente NO mencionó algún dato básico, usa null
- El precio debe ser número SIN símbolos, comas, espacios ni texto
- La divisa ya está configurada en el sistema, NO la incluyas en el precio
- "state" puede ser estado o provincia (son equivalentes)
- La descripción debe ser fluida, no una lista de características
- NO inventes información que no fue mencionada

Transcripción del agente:`;
  }
}

export async function POST(req: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession();
    const uploadToken = req.headers.get('X-Upload-Token');
    if (!session) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Si hay token pero no sesión, validarlo
    if (uploadToken && !session) {
      const { data: tokenData, error: tokenError } = await supabase
        .from('upload_tokens')
        .select('id, agent_id, expires_at, is_active')
        .eq('token', uploadToken)
        .single();

      if (tokenError || !tokenData) {
        return NextResponse.json(
          { error: 'Token inválido' },
          { status: 401 }
        );
      }

      // Verificar si el token está activo
      if (!tokenData.is_active) {
        return NextResponse.json(
          { error: 'Token desactivado' },
          { status: 401 }
        );
      }

      // Verificar si el token ha expirado
      if (new Date(tokenData.expires_at) < new Date()) {
        return NextResponse.json(
          { error: 'Token expirado' },
          { status: 401 }
        );
      }

      console.log('✅ Token validado correctamente para agente:', tokenData.agent_id);
    }

    const { transcription, property_type, listing_type, language, custom_fields } = await req.json();

    if (!transcription || transcription.trim().length < 20) {
      return NextResponse.json(
        { error: 'La transcripción es muy corta' },
        { status: 400 }
      );
    }

    if (!property_type || !listing_type) {
      return NextResponse.json(
        { error: 'Faltan property_type o listing_type' },
        { status: 400 }
      );
    }

    if (!language || !['es', 'en'].includes(language)) {
      return NextResponse.json(
        { error: 'El parámetro language debe ser "es" o "en"' },
        { status: 400 }
      );
    }

    console.log('🤖 Generando descripción con GPT-4...');
    console.log('Tipo:', property_type, '→', listing_type);
    console.log('Idioma:', language);
    console.log('Campos personalizados:', custom_fields?.length || 0);
    if (custom_fields && custom_fields.length > 0) {
      console.log('📋 Campos disponibles:', custom_fields.map((f: CustomField) => 
        `${f.field_name} (${f.field_key}) - ${f.field_type}`
      ));
    }
    console.log('Transcripción:', transcription.substring(0, 100) + '...');

    // Construir prompt dinámico según idioma
    const systemPrompt = buildPropertyPrompt(language, custom_fields || []);

    // Llamar a GPT-4
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.7,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: transcription,
        },
      ],
    });

    const responseText = completion.choices[0].message.content;
    
    if (!responseText) {
      throw new Error('No se recibió respuesta de GPT-4');
    }

    console.log('✅ Descripción generada');

    // Parsear JSON
    const property = JSON.parse(responseText);

    // Validar campos requeridos
    if (!property.title || !property.description) {
      throw new Error('Respuesta de GPT-4 incompleta');
    }

    // Asegurar valores predeterminados
    const propertyData = {
      title: property.title || 'Propiedad en venta',
      description: property.description || '',
      price: property.price || null,
      address: property.address || '',
      city: property.city || '',
      state: property.state || '',
      zip_code: property.zip_code || '',
      property_type: property_type,
      listing_type: listing_type,
      custom_fields_data: property.custom_fields_data || {},
    };

    console.log('📋 Datos extraídos:', {
      title: propertyData.title,
      price: propertyData.price,
      city: propertyData.city,
      custom_fields_keys: Object.keys(propertyData.custom_fields_data),
      custom_fields_values: propertyData.custom_fields_data,
    });

    return NextResponse.json({
      success: true,
      property: propertyData,
      tokensUsed: completion.usage?.total_tokens || 0,
    });

  } catch (error) {
    console.error('❌ Error al generar descripción:', error);
    
    return NextResponse.json(
      { 
        error: 'Error al generar la descripción',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}