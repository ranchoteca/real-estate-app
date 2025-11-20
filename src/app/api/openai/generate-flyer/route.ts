import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { supabaseAdmin } from '@/lib/supabase';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Función auxiliar para descargar imagen desde URL
async function downloadImage(imageUrl: string): Promise<Buffer> {
  try {
    console.log('📥 Descargando imagen desde:', imageUrl);
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    console.log('✅ Imagen descargada, tamaño:', buffer.length, 'bytes');
    return buffer;
  } catch (error) {
    console.error('❌ Error descargando imagen:', error);
    throw error;
  }
}

// Función para crear un archivo temporal tipo File desde Buffer
function bufferToFile(buffer: Buffer, filename: string): File {
  const blob = new Blob([buffer], { type: 'image/png' });
  return new File([blob], filename, { type: 'image/png' });
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

    console.log('🎨 Generando flyer para:', property.title);
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

    // Intentar obtener la primera foto de la propiedad
    let propertyImageUrl = property.photos && property.photos.length > 0 ? property.photos[0] : null;

    // Si no viene en el objeto, intentar obtenerla de Supabase directamente
    if (!propertyImageUrl && property.id) {
      console.log('⚠️ No hay fotos en el objeto property, buscando en Supabase...');
      
      const { data: propertyData, error: propertyError } = await supabaseAdmin
        .from('properties')
        .select('photos')
        .eq('id', property.id)
        .single();

      if (!propertyError && propertyData && propertyData.photos && propertyData.photos.length > 0) {
        propertyImageUrl = propertyData.photos[0];
        console.log('✅ Foto encontrada en Supabase:', propertyImageUrl);
      }
    }

    let imageBase64: string;
    let generationMethod: string;

    // ========================================
    // CASO 1: HAY IMAGEN - USAR IMAGE EDIT
    // ========================================
    if (propertyImageUrl) {
      console.log('📷 Imagen de propiedad encontrada:', propertyImageUrl);
      console.log('🎨 Usando images.edit() para agregar elementos sobre la foto...');

      // Descargar la imagen
      const imageBuffer = await downloadImage(propertyImageUrl);
      
      // Crear un File object desde el buffer
      const imageFile = bufferToFile(imageBuffer, 'property.png');

      // 🎨 Prompt optimizado para EDITAR imagen existente
      const editPrompt = `
Transforma esta fotografía de propiedad inmobiliaria en un flyer profesional para Facebook (1024x1024px) agregando elementos gráficos de marketing.

INFORMACIÓN DE LA PROPIEDAD:
- Título: ${property.title}
- Ubicación: ${property.location || property.city || property.address || 'Ubicación disponible'}
- Precio: ${property.price ? `$${Number(property.price).toLocaleString()}` : 'Precio a consultar'}
- Tipo: ${property.property_type || 'Propiedad'}

ESTILO VISUAL: ${style}

COLORES DE MARCA (usar exactamente):
- Color Principal: ${colorPrimary} - para título y precio
- Color Secundario: ${colorSecondary} - para ubicación y detalles

INSTRUCCIONES DE EDICIÓN:
1. MANTÉN la fotografía original visible y reconocible como base
2. Aplica un overlay oscuro semitransparente (30% opacidad) para legibilidad
3. AGREGA elementos gráficos profesionales superpuestos:

   PARTE SUPERIOR:
   ${logoUrl ? '- Espacio limpio superior izquierdo (140x140px) para logo' : ''}
   - Título: "${property.title}" en tipografía GRANDE, BOLD (color: ${colorPrimary})
   - Debe ser el elemento más prominente
   
   CENTRO:
   - Ícono de ubicación + "${property.location || property.city || property.address || 'Ubicación disponible'}"
   - Tamaño mediano, color: ${colorSecondary}
   
   PARTE INFERIOR:
   - Precio: "${property.price ? `$${Number(property.price).toLocaleString()}` : 'Precio a consultar'}" 
   - En tamaño GRANDE con badge decorativo (color: ${colorPrimary})
   - Tipo de propiedad: "${property.property_type || 'Propiedad'}" en pequeño

4. Tipografía: Sans-serif moderna, alta legibilidad
5. Alto contraste texto/fondo
6. NO agregar personas, caras o figuras humanas
7. Mantener fotografía original como protagonista
8. Balance profesional entre foto real y elementos gráficos
9. Estética de marketing inmobiliario premium

RESULTADO: Flyer atractivo que combine la foto real con diseño gráfico profesional para redes sociales.
      `.trim();

      console.log('📤 Enviando a OpenAI images.edit()...');

      // Llamada a images.edit() - NO acepta response_format
      const result = await openai.images.edit({
        model: 'gpt-image-1',
        image: imageFile as any, // Cast necesario para TypeScript
        prompt: editPrompt,
        n: 1,
        size: '1024x1024',
        // ❌ NO usar response_format aquí - no es compatible con images.edit()
      });

      // El resultado viene en b64_json por defecto
      imageBase64 = result.data[0].b64_json!;
      generationMethod = 'images.edit (con foto real)';
      console.log('✅ Imagen editada correctamente');

    // ========================================
    // CASO 2: NO HAY IMAGEN - GENERAR DESDE CERO
    // ========================================
    } else {
      console.log('⚠️ No hay imagen de propiedad disponible');
      console.log('🎨 Usando images.generate() para crear arte desde cero...');

      // 🎨 Prompt para GENERAR imagen completamente nueva
      const generatePrompt = `
Crea un arte digital profesional para publicidad inmobiliaria en Facebook (1024x1024px) desde cero.

INFORMACIÓN DE LA PROPIEDAD:
- Título: ${property.title}
- Ubicación: ${property.location || property.city || property.address || 'Ubicación disponible'}
- Precio: ${property.price ? `$${Number(property.price).toLocaleString()}` : 'Precio a consultar'}
- Tipo: ${property.property_type || 'Propiedad'}

ESTILO VISUAL: ${style}

COLORES DE MARCA (usar exactamente):
- Color Principal: ${colorPrimary}
- Color Secundario: ${colorSecondary}

COMPOSICIÓN DEL DISEÑO:
1. Fondo: Gradiente suave o textura abstracta relacionada con arquitectura/bienes raíces
2. ${logoUrl ? 'Espacio superior izquierdo limpio (140x140px) para logo' : 'Área superior elegante'}

3. ELEMENTOS VISUALES:
   - Ilustración o representación estilizada de ${property.property_type || 'propiedad'}
   - Puede incluir: silueta de edificio, casa moderna, o elementos arquitectónicos abstractos
   - Estilo: fotorrealista profesional o ilustración de alta calidad

4. TEXTO SUPERPUESTO:
   SUPERIOR/CENTRO:
   - Título: "${property.title}" (GRANDE, BOLD, color: ${colorPrimary})
   
   MEDIO:
   - Ubicación con ícono: "${property.location || property.city || property.address || 'Ubicación'}"
   - Color: ${colorSecondary}
   
   INFERIOR:
   - Precio destacado: "${property.price ? `$${Number(property.price).toLocaleString()}` : 'Consultar precio'}"
   - Con badge o elemento gráfico (color: ${colorPrimary})
   - Tipo: "${property.property_type || 'Propiedad'}"

5. REQUISITOS:
   - Tipografía moderna sans-serif
   - Alto contraste y legibilidad perfecta
   - NO incluir personas, caras ni figuras humanas
   - Composición balanceada y profesional
   - Estética premium de marketing inmobiliario
   - Los colores ${colorPrimary} y ${colorSecondary} deben ser dominantes

RESULTADO: Un diseño atractivo, profesional y efectivo para redes sociales que transmita calidad y profesionalismo.
      `.trim();

      console.log('📤 Enviando a OpenAI images.generate()...');

      // Llamada a images.generate()
      const result = await openai.images.generate({
        model: 'gpt-image-1',
        prompt: generatePrompt,
        n: 1,
        size: '1024x1024',
        response_format: 'b64_json',
      });

      imageBase64 = result.data[0].b64_json!;
      generationMethod = 'images.generate (arte generado)';
      console.log('✅ Imagen generada correctamente');
    }

    // ========================================
    // SUBIR A SUPABASE
    // ========================================
    console.log('📤 Subiendo a Supabase Storage...');

    // Convertir base64 a buffer
    const imageBuffer = Buffer.from(imageBase64, 'base64');

    // Obtener agent_id y crear nombre de archivo
    const agentId = property.agent_id || 'default';
    const sanitizedTitle = property.title.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const fileName = `${agentId}/flyers/${Date.now()}-${sanitizedTitle}.png`;

    console.log('📁 Ruta de archivo:', fileName);

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

    console.log('✅ Flyer generado y subido exitosamente');
    console.log('🔗 URL pública:', publicUrl);
    console.log('📂 Método usado:', generationMethod);

    return NextResponse.json({
      success: true,
      imageUrl: publicUrl,
      source: generationMethod,
      model: 'gpt-image-1',
      template,
      colors: {
        primary: colorPrimary,
        secondary: colorSecondary,
      },
      hasPropertyImage: !!propertyImageUrl,
      filePath: fileName,
    });

  } catch (error: any) {
    console.error('❌ Error generando flyer:', error);
    
    // Logging detallado del error
    if (error.response) {
      console.error('OpenAI API Response Error:', error.response.data);
    }
    
    if (error.status === 403) {
      console.error('⚠️ Error 403: No tienes acceso a la API de imágenes');
      console.error('💡 Verifica tu cuenta en https://platform.openai.com');
    }

    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Error generando flyer',
        details: error.response?.data || null,
        status: error.status || 500,
      },
      { status: error.status || 500 }
    );
  }
}