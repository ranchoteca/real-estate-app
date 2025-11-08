import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { supabaseAdmin } from '@/lib/supabase';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Función auxiliar para descargar y convertir imagen a base64
async function downloadImageAsBase64(imageUrl: string): Promise<string> {
  try {
    console.log('📥 Descargando imagen desde:', imageUrl);
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    
    // Detectar el tipo de imagen desde Content-Type
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    
    console.log('✅ Imagen descargada, tamaño:', buffer.length, 'bytes');
    console.log('📄 Content-Type:', contentType);
    
    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    console.error('❌ Error descargando imagen:', error);
    throw error;
  }
}

export async function POST(req: NextRequest) {
  try {
    const {
      property,
      template,
      colorPrimary,
      colorSecondary,
      logoUrl,
    } = await req.json();

    console.log('🎨 Generando arte digital con gpt-4o para:', property.title);
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
    const propertyImageUrl = property.photos && property.photos.length > 0 ? property.photos[0] : null;

    if (!propertyImageUrl) {
      throw new Error('No hay imagen de propiedad disponible. Se requiere al menos una foto.');
    }

    console.log('📷 Imagen de propiedad encontrada:', propertyImageUrl);

    // 🎨 Prompt optimizado para usar imagen base
    const prompt = `
Crea un arte digital profesional para publicidad inmobiliaria en Facebook (formato cuadrado 1024x1024px) usando la imagen de la propiedad proporcionada como base.

INFORMACIÓN DE LA PROPIEDAD:
- Título: ${property.title}
- Ubicación: ${property.location || property.city || property.address || 'Ubicación disponible'}
- Precio: ${property.price ? `$${Number(property.price).toLocaleString()}` : 'Precio a consultar'}
- Tipo: ${property.property_type || 'Propiedad'}

ESTILO VISUAL: ${style}

COLORES DE MARCA (usar exactamente estos colores):
- Color Principal: ${colorPrimary} - para el título de la propiedad
- Color Secundario: ${colorSecondary} - para ubicación y elementos decorativos

REQUISITOS CRÍTICOS DEL DISEÑO:
1. USA LA IMAGEN PROPORCIONADA como fondo principal - mantenla visible y reconocible
2. Aplica un overlay oscuro semitransparente (25-35% de opacidad) sobre la imagen para mejorar la legibilidad del texto
3. Superpón elementos de texto profesionales sobre la imagen:
   
   PARTE SUPERIOR:
   - ${logoUrl ? 'Reserva esquina superior izquierda (140x140px) completamente limpia y clara para colocar logo después' : 'Área superior limpia'}
   - Título de la propiedad en tipografía GRANDE, BOLD y moderna (color: ${colorPrimary})
   - Debe ser el elemento más prominente visualmente
   
   PARTE MEDIA:
   - Ubicación con ícono de pin/ubicación estilizado (color: ${colorSecondary})
   - Tamaño mediano, claramente visible
   
   PARTE INFERIOR:
   - Precio en tamaño GRANDE y destacado (color: ${colorPrimary})
   - Puede incluir badge o shape decorativo de fondo

4. IMPORTANTE: La imagen de la propiedad debe permanecer claramente visible y reconocible a través del overlay
5. Tipografía moderna, sans-serif, altamente legible
6. Alto contraste entre texto y fondo para máxima legibilidad
7. NO incluir personas, caras o figuras humanas
8. Estética profesional de marketing inmobiliario premium para redes sociales
9. Los colores de marca (${colorPrimary} y ${colorSecondary}) deben ser elementos visuales dominantes
10. Composición equilibrada y profesional

RESULTADO ESPERADO:
Un diseño que combine profesionalmente la fotografía real de la propiedad con elementos gráficos modernos y texto superpuesto, creando un flyer atractivo y efectivo para Facebook.
    `.trim();

    console.log('🤖 Iniciando generación con Responses API (gpt-4o)...');

    // Descargar y convertir imagen a base64
    const imageBase64DataUrl = await downloadImageAsBase64(propertyImageUrl);

    // Preparar el content array con la imagen
    const contentArray = [
      {
        type: 'input_text',
        text: prompt,
      },
      {
        type: 'input_image',
        image_url: imageBase64DataUrl,
      },
    ];

    console.log('📤 Enviando request a OpenAI con imagen de referencia...');

    // 🚀 Llamada a Responses API con gpt-4o
    const response = await openai.responses.create({
      model: 'gpt-4o',
      input: [
        {
          role: 'user',
          content: contentArray,
        },
      ],
      tools: [
        {
          type: 'image_generation',
          size: '1024x1024',
          quality: 'high',
          output_format: 'png',
          input_fidelity: 'high', // Mantener alta fidelidad de la imagen original
        }
      ],
    });

    console.log('📦 Respuesta recibida de OpenAI');

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

    console.log('✅ Imagen generada correctamente por gpt-4o');
    console.log('📤 Subiendo a Supabase Storage...');

    // Convertir base64 a buffer (remover el prefijo data:image si existe)
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Obtener agent_id y crear nombre de archivo
    const agentId = property.agent_id || 'default';
    const sanitizedTitle = property.title.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const fileName = `${agentId}/flyers/${Date.now()}-${sanitizedTitle}.png`;

    console.log('📁 Ruta de archivo:', fileName);
    console.log('🗂️ Esto creará: property-photos/' + agentId + '/flyers/');

    // Subir a Supabase Storage
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

    console.log('✅ Archivo subido exitosamente a Supabase');

    // Obtener URL pública
    const { data: publicUrlData } = supabaseAdmin
      .storage
      .from('property-photos')
      .getPublicUrl(fileName);

    const publicUrl = publicUrlData.publicUrl;

    console.log('✅ Arte digital generado y subido exitosamente');
    console.log('🔗 URL pública:', publicUrl);
    console.log('📂 Ubicación: property-photos/' + agentId + '/flyers/');

    return NextResponse.json({
      success: true,
      imageUrl: publicUrl,
      source: 'gpt-4o-responses-api',
      model: 'gpt-4o',
      template,
      colors: {
        primary: colorPrimary,
        secondary: colorSecondary,
      },
      hasPropertyImage: true,
      filePath: fileName,
    });

  } catch (error: any) {
    console.error('❌ Error generando arte digital:', error);
    
    // Logging detallado del error
    if (error.response) {
      console.error('OpenAI API Response Error:', error.response.data);
    }
    
    if (error.status === 403) {
      console.error('⚠️ Error 403: No tienes acceso a gpt-4o con Responses API');
      console.error('💡 Posibles soluciones:');
      console.error('   1. Verifica tu organización en https://platform.openai.com/settings/organization/general');
      console.error('   2. Espera 15 minutos después de verificar');
      console.error('   3. Verifica que tu API key tenga los permisos correctos');
    }

    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Error generando arte digital',
        details: error.response?.data || null,
        status: error.status || 500,
      },
      { status: error.status || 500 }
    );
  }
}