import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface CustomField {
  field_key: string;   
  field_name: string;
  field_type: 'text' | 'number';
  icon: string;
}

function buildPropertyPrompt(customFields: CustomField[] = []): string {
  const customFieldsSection = customFields.length > 0 
    ? `\n\n4. CAMPOS PERSONALIZADOS (extraer del audio si se mencionan):
${customFields.map(f => `   - ${f.icon} ${f.field_name} [key: ${f.field_key}] (${f.field_type === 'number' ? 'número' : 'texto'})`).join('\n')}

   IMPORTANTE: Los campos personalizados deben ir en un objeto "custom_fields_data" usando el field_key de cada campo.
   No uses el field_name como key, usa el field_key que se proporciona en la lista de campos.
   Si el agente NO mencionó un campo, NO lo incluyas en custom_fields_data.`
    : '';

  return `Eres un experto en copywriting de bienes raíces. 

Un agente inmobiliario acaba de describir una propiedad por voz. Tu trabajo es:

1. EXTRAER toda la información estructurada que mencionó:
   - Precio (si lo mencionó)
   - Ubicación completa (dirección, ciudad, estado/provincia, código postal)
   - Características destacadas

2. GENERAR una descripción profesional y atractiva:
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
  "zip_code": "78701"${customFields.length > 0 ? ',\n  "custom_fields_data": {\n' + customFields.map(f => `    "${f.field_key}": "${f.field_type === 'number' ? '25' : 'Ejemplo de valor'}"`).join(',\n') + '\n  }' : ''}
}${customFieldsSection}

REGLAS IMPORTANTES:
- Si el agente NO mencionó algún dato, usa null (excepto custom_fields_data que no debe incluir campos no mencionados)
- El precio debe ser número sin símbolos ni comas
- "state" puede ser estado o provincia (son equivalentes)
- La descripción debe ser fluida, no una lista de características
- NO inventes información que no fue mencionada
- custom_fields_data: solo incluir campos que SÍ fueron mencionados en el audio

Transcripción del agente:`;
}

export async function POST(req: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const { transcription, property_type, listing_type, custom_fields } = await req.json();

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

    console.log('🤖 Generando descripción con GPT-4...');
    console.log('Tipo:', property_type, '→', listing_type);
    console.log('Campos personalizados:', custom_fields?.length || 0);
    console.log('Transcripción:', transcription.substring(0, 100) + '...');

    // Construir prompt dinámico
    const systemPrompt = buildPropertyPrompt(custom_fields || []);

    // Llamar a GPT-4
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
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
      temperature: 0.7,
      response_format: { type: 'json_object' },
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
      custom_fields: Object.keys(propertyData.custom_fields_data).length,
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