import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import sharp from 'sharp';

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

    console.log('🎨 Generando flyer para:', property.title);

    const hasImages = property.photos && property.photos.length > 0;
    const baseImageUrl = hasImages ? property.photos[0] : null;

    // 🖼️ Si existe imagen real, usarla como base
    if (baseImageUrl) {
      console.log('🖼️ Usando la primera imagen real de la propiedad como base');

      const baseRes = await fetch(baseImageUrl);
      const baseBuffer = Buffer.from(await baseRes.arrayBuffer());

      // 🧠 Crear capa SVG con los tres campos: título, ubicación y precio
      const overlaySvg = `
        <svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
          <!-- Oscurece ligeramente la imagen para mejorar legibilidad -->
          <rect width="1024" height="1024" fill="rgba(0,0,0,0.25)" />
          
          <!-- Franja inferior semitransparente -->
          <rect x="0" y="760" width="1024" height="264" fill="rgba(255,255,255,0.92)" />

          <!-- Título -->
          <text x="60" y="860" font-family="Arial, sans-serif" font-size="50" font-weight="bold" fill="${colorPrimary}">
            ${property.title?.toUpperCase() || 'PROPIEDAD EN VENTA'}
          </text>

          <!-- Ubicación -->
          <text x="60" y="920" font-family="Arial, sans-serif" font-size="36" fill="${colorSecondary}">
            ${property.location || 'Ubicación no disponible'}
          </text>

          <!-- Precio -->
          <text x="60" y="980" font-family="Arial, sans-serif" font-size="42" font-weight="bold" fill="${colorPrimary}">
            ${property.price ? `$${property.price.toLocaleString()}` : 'Contactar precio'}
          </text>
        </svg>
      `;

      // 🧩 Composición de la imagen base + la capa SVG
      let composed = sharp(baseBuffer)
        .resize(1024, 1024, { fit: 'cover' })
        .composite([{ input: Buffer.from(overlaySvg), top: 0, left: 0 }]);

      // 🏷️ Si el agente tiene logo, lo colocamos en la esquina superior izquierda
      if (logoUrl) {
        console.log('🏷️ Agregando logo del agente');

        const logoRes = await fetch(logoUrl);
        const logoBuffer = Buffer.from(await logoRes.arrayBuffer());

        composed = composed.composite([
          {
            input: await sharp(logoBuffer)
              .resize(140, 140, { fit: 'contain' })
              .png()
              .toBuffer(),
            top: 40,
            left: 40,
          },
        ]);
      }

      // 📸 Exportar imagen final en formato Base64
      const outputBuffer = await composed.jpeg({ quality: 90 }).toBuffer();
      const base64Image = `data:image/jpeg;base64,${outputBuffer.toString('base64')}`;

      console.log('✅ Flyer generado con imagen real y colores del agente');

      return NextResponse.json({
        success: true,
        source: 'real-photo',
        imageBase64: base64Image,
      });
    }

    // ⚙️ Si no hay imágenes, usar DALL·E 3 como fallback
    console.log('⚙️ No hay imagen ni logo, usando DALL·E 3 para generar arte');

    const templateStyles = {
      moderna: 'Modern real estate flyer with clean geometric layout and strong typography',
      elegante: 'Elegant luxury real estate flyer with premium look and serif fonts',
      minimalista: 'Minimalist flyer with soft background and simple visual hierarchy',
      vibrante: 'Vibrant flyer with high contrast and colorful accents',
    };

    const prompt = `
      Create a professional real estate flyer with these specs:
      STYLE: ${templateStyles[template as keyof typeof templateStyles]}
      PROPERTY DETAILS:
      - Title: ${property.title}
      - Location: ${property.location}
      - Price: $${property.price?.toLocaleString() || 'Contact for price'}

      DESIGN REQUIREMENTS:
      - Primary brand color: ${colorPrimary}
      - Secondary brand color: ${colorSecondary}
      - Prominent price display
      - Include clear space for logo
      - Square 1024x1024 format suitable for Facebook
      - No people, realistic architectural look
    `;

    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt,
      size: '1024x1024',
      n: 1,
      style: 'natural',
      quality: 'standard',
    });

    const imageUrl = response.data[0].url;
    if (!imageUrl) throw new Error('No se generó la imagen con DALL·E');

    console.log('✅ Flyer generado con DALL·E 3 (fallback)');
    return NextResponse.json({
      success: true,
      source: 'dalle',
      imageUrl,
    });
  } catch (error: any) {
    console.error('❌ Error generando flyer:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error generando flyer' },
      { status: 500 }
    );
  }
}
