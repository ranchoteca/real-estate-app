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
2. ${propertyImage ? `IMPORTANTE - Usa esta imagen de la propiedad como fondo: ${propertyImage}
   - La foto de la propiedad debe ser el fondo principal del diseño
   - Aplica una capa oscura sutil (20-30% de opacidad) sobre la foto para asegurar la legibilidad del texto
   - La foto debe llenar todo el canvas de 1024x1024` : 'Fondo: Genera un fondo arquitectónico o abstracto sutil'}
3. Estructura del diseño:
   ${logoUrl ? '- Esquina superior izquierda: Área limpia y clara reservada para superponer el logo de la empresa (espacio de 140x140px)' : '- Sección superior: Encabezado moderno y limpio'}
   - Centro/Área superior: Nombre de la propiedad en tipografía GRANDE y bold (color: ${colorPrimary})
   - Sección media: Texto de ubicación con ícono de pin/mapa (color: ${colorSecondary})
   - Área inferior: Precio mostrado de forma prominente (color: ${colorPrimary})
4. Tipografía: Fuentes profesionales, modernas y altamente legibles con sombras de texto o fondos para legibilidad sobre la foto
5. Estética general: Material de marketing de bienes raíces premium
6. SIN personas visibles, SIN portadas de revista - esto es arte digital para redes sociales
7. Alto contraste para excelente legibilidad - el texto debe destacarse claramente sobre la foto de fondo
8. Los colores de marca deben ser los elementos visuales dominantes para texto y componentes de UI

${propertyImage ? 'CRÍTICO: La imagen de la propiedad DEBE usarse como fondo. Superpón la información de texto sobre esta foto con el contraste y legibilidad apropiados.' : 'Genera un fondo arquitectónico apropiado ya que no hay foto de la propiedad disponible.'}

Crea una pieza de arte digital limpia y profesional que se vea como contenido de marketing inmobiliario moderno para redes sociales.
    `.trim();

    console.log('🤖 Llamando a GPT-5 con Responses API...');

    // 🚀 Usar GPT-5 Responses API
    let input: any;

    if (propertyImage) {
      // Si hay imagen de la propiedad, enviarla junto con el prompt
      input = [
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: instruction,
            },
            {
              type: 'input_image',
              image_url: propertyImage,
            },
          ],
        },
      ];
    } else {
      // Si no hay imagen, solo texto
      input = instruction;
    }

    const response = await openai.responses.create({
      model: 'gpt-5',
      input,
      reasoning: {
        effort: 'medium',
      },
      text: {
        verbosity: 'low',
      },
    });

    console.log('📦 Respuesta de GPT-5:', response);

    // GPT-5 puede devolver SVG en output_text, necesitamos extraerlo
    let imageContent = null;
    
    // Verificar si hay una URL de imagen directa
    if (response.output_image_url) {
      imageContent = response.output_image_url;
      console.log('✅ GPT-5 devolvió URL de imagen directa');
    } 
    // Si devolvió SVG en el texto
    else if (response.output_text && response.output_text.includes('<svg')) {
      console.log('⚠️ GPT-5 devolvió SVG en texto, extrayendo...');
      
      // Extraer el SVG del texto
      const svgMatch = response.output_text.match(/<svg[\s\S]*?<\/svg>/);
      if (svgMatch) {
        const svgContent = svgMatch[0];
        
        // Convertir SVG a base64 data URL
        const base64Svg = Buffer.from(svgContent).toString('base64');
        imageContent = `data:image/svg+xml;base64,${base64Svg}`;
        
        console.log('✅ SVG convertido a data URL');
      }
    }
    // Si hay contenido de mensaje
    else if (response.output && response.output.length > 1) {
      const messageContent = response.output.find((item: any) => item.type === 'message');
      if (messageContent?.content) {
        const textContent = messageContent.content.find((c: any) => c.type === 'text');
        if (textContent?.text && textContent.text.includes('<svg')) {
          const svgMatch = textContent.text.match(/<svg[\s\S]*?<\/svg>/);
          if (svgMatch) {
            const svgContent = svgMatch[0];
            const base64Svg = Buffer.from(svgContent).toString('base64');
            imageContent = `data:image/svg+xml;base64,${base64Svg}`;
            console.log('✅ SVG extraído del mensaje y convertido');
          }
        }
      }
    }

    if (!imageContent) {
      console.error('❌ No se pudo extraer contenido de imagen de GPT-5');
      console.error('Response output:', JSON.stringify(response.output, null, 2));
      throw new Error('GPT-5 no generó una imagen válida');
    }

    console.log('✅ Arte digital generado exitosamente');

    return NextResponse.json({
      success: true,
      imageUrl: imageContent,
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