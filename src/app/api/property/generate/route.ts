import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const PROPERTY_PROMPT = `Eres un experto en copywriting de bienes raíces. 

Un agente inmobiliario acaba de describir una propiedad por voz. Tu trabajo es:

1. EXTRAER toda la información estructurada que mencionó:
   - Tipo de propiedad (house, condo, apartment, land, commercial)
   - Precio (si lo mencionó)
   - Ubicación completa (dirección, ciudad, estado, código postal)
   - Habitaciones (bedrooms)
   - Baños (bathrooms)
   - Pies cuadrados (sqft)
   - Características destacadas

2. GENERAR una descripción profesional y atractiva:
   - Título llamativo (máximo 80 caracteres)
   - Descripción completa (250-400 palabras)
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
  "zip_code": "78701",
  "bedrooms": 3,
  "bathrooms": 2.5,
  "sqft": 2100,
  "property_type": "house"
}

REGLAS IMPORTANTES:
- Si el agente NO mencionó algún dato, usa null
- El precio debe ser número sin símbolos ni comas
- Los baños pueden ser decimales (2.5 = 2 baños completos + 1 medio baño)
- property_type debe ser uno de: house, condo, apartment, land, commercial
- La descripción debe ser fluida, no una lista de características
- NO inventes información que no fue mencionada

Transcripción del agente:`;

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

    const { transcription } = await req.json();

    if (!transcription || transcription.trim().length < 20) {
      return NextResponse.json(
        { error: 'La transcripción es muy corta' },
        { status: 400 }
      );
    }

    console.log('🤖 Generando descripción con GPT-4...');
    console.log('Transcripción:', transcription.substring(0, 100) + '...');

    // Llamar a GPT-4
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Más barato y rápido, puedes usar 'gpt-4' si prefieres
      messages: [
        {
          role: 'system',
          content: PROPERTY_PROMPT,
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
      bedrooms: property.bedrooms || null,
      bathrooms: property.bathrooms || null,
      sqft: property.sqft || null,
      property_type: property.property_type || 'house',
    };

    console.log('📋 Datos extraídos:', {
      title: propertyData.title,
      price: propertyData.price,
      bedrooms: propertyData.bedrooms,
      city: propertyData.city,
    });

    return NextResponse.json({
      success: true,
      property: propertyData,
      tokensUsed: completion.usage?.total_tokens || 0,
    });

  } catch (error: any) {
    console.error('❌ Error al generar descripción:', error);
    
    return NextResponse.json(
      { 
        error: 'Error al generar la descripción',
        details: error.message 
      },
      { status: 500 }
    );
  }
}