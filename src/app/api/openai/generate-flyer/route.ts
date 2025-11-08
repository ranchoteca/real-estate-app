import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

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

    // 🎨 Instrucción para GPT-5 en español
    const instruction = `
Crea un arte digital profesional de bienes raíces para redes sociales (publicación de Facebook) con estas especificaciones exactas:

INFORMACIÓN DE LA PROPIEDAD:
- Nombre de la propiedad: ${property.title}
- Ubicación: ${property.location || 'Ubicación disponible'}
- Precio: ${property.price ? `${Number(property.price).toLocaleString()}` : 'Consultar precio'}
${propertyImage ? `- URL de la foto de la propiedad: ${propertyImage}` : ''}

ESTILO VISUAL: ${style}

COLORES DE MARCA (USAR EXACTAMENTE ESTOS COLORES):
- Color Primario: ${colorPrimary} - usar para el nombre/título de la propiedad
- Color Secundario: ${colorSecondary} - usar para el texto de ubicación y elementos decorativos

REQUISITOS DE DISEÑO:
1. Formato: Cuadrado 1024x1024px perfecto para Facebook
2. Estructura del diseño:
   ${logoUrl ? '- Esquina superior izquierda: Área limpia y clara reservada para superponer el logo de la empresa (espacio de 140x140px)' : '- Sección superior: Encabezado moderno y limpio'}
   - Centro/Área superior: Nombre de la propiedad en tipografía GRANDE y bold (color: ${colorPrimary})
   - Sección media: Texto de ubicación con ícono de pin/mapa (color: ${colorSecondary})
   - Área inferior: Precio mostrado de forma prominente (color: ${colorPrimary})
3. Fondo: Elementos arquitectónicos sutiles o diseño abstracto que no compita con el texto
4. Tipografía: Fuentes profesionales, modernas y altamente legibles
5. Estética general: Material de marketing de bienes raíces premium
6. SIN personas, SIN portadas de revista - esto es arte digital para redes sociales
7. Alto contraste para excelente legibilidad
8. Los colores de marca deben ser los elementos visuales dominantes

Crea una pieza de arte digital limpia y profesional que se vea como contenido de marketing inmobiliario moderno para redes sociales.
    `.trim();

    console.log('🤖 Llamando a GPT-5 con Responses API...');

    // 🚀 Usar GPT-5 Responses API
    const response = await openai.responses.create({
      model: 'gpt-5',
      input: instruction,
      reasoning: {
        effort: 'medium',
      },
      text: {
        verbosity: 'low',
      },
    });

    console.log('📦 Respuesta de GPT-5:', response);

    // Extraer la URL de la imagen generada
    const imageUrl = response.output_image_url || response.output_text;

    if (!imageUrl) {
      throw new Error('GPT-5 no generó una imagen válida');
    }

    console.log('✅ Arte digital generado exitosamente:', imageUrl);

    return NextResponse.json({
      success: true,
      imageUrl,
      source: 'gpt-5',
      template,
      colors: {
        primary: colorPrimary,
        secondary: colorSecondary,
      },
    });

  } catch (error: any) {
    console.error('❌ Error generando arte digital:', error);
    
    if (error.response) {
      console.error('GPT-5 API Error:', error.response.data);
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