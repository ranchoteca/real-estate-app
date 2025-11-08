import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { supabaseAdmin } from '@/lib/supabase';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const {
      property,
      template,
      colorPrimary,
      colorSecondary,
      logoUrl,
    } = await req.json();

    console.log('🎨 Generando arte digital con GPT-5 para:', property.title);
    console.log('🎨 Template:', template);
    console.log('🎨 Colores:', { colorPrimary, colorSecondary });
    console.log('🏷️ Logo:', logoUrl || 'Sin logo');

    // 📝 Estilos visuales
    const visualStyles = {
      moderna: 'diseño minimalista moderno con formas geométricas limpias y arquitectura contemporánea',
      elegante: 'diseño de lujo elegante con estética premium sofisticada y detalles refinados',
      minimalista: 'diseño ultra-minimalista con máximo espacio en blanco y jerarquía visual simple',
      vibrante: 'diseño vibrante y energético con colores audaces y elementos visuales dinámicos',
    };

    const style = visualStyles[template as keyof typeof visualStyles] || visualStyles.moderna;

    // Obtener la primera foto de la propiedad
    const propertyImage = property.photos && property.photos.length > 0 ? property.photos[0] : null;

    // 🎨 Prompt optimizado para generar arte digital
    const prompt = `
Genera un arte digital profesional para publicidad inmobiliaria en Facebook (formato cuadrado 1024x1024px).

INFORMACIÓN DE LA PROPIEDAD:
- Título: ${property.title}
- Ubicación: ${property.location || 'Ubicación disponible'}
- Precio: ${property.price ? `$${Number(property.price).toLocaleString()}` : 'Consultar precio'}

ESTILO VISUAL: ${style}

COLORES DE MARCA (usar estos colores exactos):
- Color Principal: ${colorPrimary} - para el título de la propiedad
- Color Secundario: ${colorSecondary} - para ubicación y elementos decorativos

REQUISITOS DEL DISEÑO:
${propertyImage ? `
- Usa la imagen de la propiedad proporcionada como fondo principal
- Aplica una capa oscura semitransparente (25-35% de opacidad) sobre la foto para mejorar la legibilidad del texto
- El fondo debe ser la fotografía de la propiedad en toda la composición
` : `
- Crea un fondo arquitectónico moderno y atractivo
- Usa elementos visuales sutiles relacionados con bienes raíces
`}

COMPOSICIÓN:
1. ${logoUrl ? 'Reserva la esquina superior izquierda (140x140px) como área limpia y clara para logo' : 'Encabezado limpio en la parte superior'}
2. Centro/Parte superior: Título de la propiedad en tipografía GRANDE y bold (color: ${colorPrimary})
3. Sección media: Ubicación con ícono de pin/mapa (color: ${colorSecondary})
4. Parte inferior: Precio de forma prominente y clara (color: ${colorPrimary})

ESTILO:
- Tipografía moderna, profesional y altamente legible
- Alto contraste para excelente legibilidad
- Sin personas visibles
- Apariencia de marketing inmobiliario premium para redes sociales
- Los colores de marca deben ser elementos visuales dominantes

${propertyImage ? 'IMPORTANTE: Superpón el texto sobre la fotografía de la propiedad con excelente contraste y legibilidad.' : ''}

Genera un diseño limpio y profesional para Facebook.
    `.trim();

    console.log('🤖 Generando arte con Responses API...');

    // Preparar el input con imagen si existe
    const contentArray: any[] = [
      {
        type: 'input_text',
        text: prompt,
      },
    ];

    // Si hay imagen de la propiedad, agregarla
    if (propertyImage) {
      contentArray.push({
        type: 'input_image',
        image_url: propertyImage,
      });
    }

    // 🚀 Usar Responses API con image_generation tool
    const response = await openai.responses.create({
      model: 'gpt-4.1',
      input: [
        {
          role: 'user',
          content: contentArray,
        },
      ],
      tools: [{ type: 'image_generation' }],
    });

    console.log('📦 Respuesta recibida');

    // Extraer la imagen generada
    const imageGenerationCalls = response.output.filter(
      (output: any) => output.type === 'image_generation_call'
    );

    if (!imageGenerationCalls || imageGenerationCalls.length === 0) {
      console.error('❌ No se generó imagen');
      console.error('Response output:', JSON.stringify(response.output, null, 2));
      throw new Error('No se generó imagen en la respuesta');
    }

    const imageBase64 = imageGenerationCalls[0].result;

    if (!imageBase64) {
      throw new Error('No se recibió imagen base64');
    }

    console.log('✅ Imagen generada correctamente');
    console.log('📤 Subiendo a Supabase Storage...');

    // Convertir base64 a buffer
    const imageBuffer = Buffer.from(imageBase64, 'base64');

    // ✅ CAMBIO 1: Obtener agent_id y usar estructura correcta
    const agentId = property.agent_id || 'default';
    const fileName = `${agentId}/flyers/${Date.now()}-${property.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.png`;

    // ✅ CAMBIO 2: Usar bucket 'property-photos' que sí existe
    const { data: uploadData, error: uploadError } = await supabaseAdmin
      .storage
      .from('property-photos')
      .upload(fileName, imageBuffer, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('❌ Error subiendo a Supabase:', uploadError);
      throw new Error(`Error subiendo imagen: ${uploadError.message}`);
    }

    // ✅ CAMBIO 3: Obtener URL pública del bucket correcto
    const { data: publicUrlData } = supabaseAdmin
      .storage
      .from('property-photos')
      .getPublicUrl(fileName);

    const publicUrl = publicUrlData.publicUrl;

    console.log('✅ Arte digital subido exitosamente:', publicUrl);

    return NextResponse.json({
      success: true,
      imageUrl: publicUrl,
      source: 'gpt-4.1-image-generation',
      template,
      colors: {
        primary: colorPrimary,
        secondary: colorSecondary,
      },
    });

  } catch (error: any) {
    console.error('❌ Error generando arte digital:', error);
    
    if (error.response) {
      console.error('OpenAI API Error:', error.response.data);
    }

    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Error generando arte digital',
        details: error.response?.data || null,
      },
      { status: 500 }
    );
  }
}