import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import sharp from 'sharp';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { property, template, colorPrimary, colorSecondary, logoUrl } = await req.json();

    console.log('🎨 Generando flyer para:', property.title);

    const hasImages = property.images && property.images.length > 0;
    const baseImageUrl = hasImages ? property.images[0] : null;

    // Si la propiedad tiene al menos una imagen, usamos la primera como base
    if (baseImageUrl) {
      console.log('🖼️ Usando la primera imagen de la propiedad como base');

      // Descargar imagen base
      const baseRes = await fetch(baseImageUrl);
      const baseBuffer = Buffer.from(await baseRes.arrayBuffer());

      // SVG overlay con textos
      const overlaySvg = `
        <svg width="1024" height="1024">
          <rect width="1024" height="1024" fill="none" />
          <text x="60" y="860" font-size="46" font-weight="bold" fill="${colorPrimary}">
            ${property.title}
          </text>
          <text x="60" y="920" font-size="36" fill="${colorSecondary}">
            ${property.location}
          </text>
          <text x="60" y="980" font-size="40" fill="${colorPrimary}">
            ${property.price ? `$${property.price.toLocaleString()}` : 'Contact for price'}
          </text>
        </svg>
      `;

      // Composición
      let composed = sharp(baseBuffer)
        .resize(1024, 1024, { fit: 'cover' })
        .composite([{ input: Buffer.from(overlaySvg), top: 0, left: 0, blend: 'over' }]);

      // Agregar logo si existe
      if (logoUrl) {
        console.log('🏷️ Agregando logo del agente');
        const logoRes = await fetch(logoUrl);
        const logoBuffer = Buffer.from(await logoRes.arrayBuffer());
        composed = composed.composite([
          { input: logoBuffer, top: 40, left: 40, blend: 'over' },
        ]);
      }

      const outputBuffer = await composed.jpeg({ quality: 90 }).toBuffer();
      const base64Image = `data:image/jpeg;base64,${outputBuffer.toString('base64')}`;

      console.log('✅ Flyer generado a partir de la imagen real');

      return NextResponse.json({
        success: true,
        imageBase64: base64Image,
      });
    }

    // Si no hay imagen ni logo, generamos arte con DALL·E 3
    console.log('⚙️ No hay imagen base, usando DALL·E 3');

    const templateStyles = {
      moderna: 'Modern minimalist design with clean geometric shapes and bold typography',
      elegante: 'Elegant luxury real estate design with sophisticated serif fonts and premium feel',
      minimalista: 'Ultra-minimalist design with plenty of white space and simple elements',
      vibrante: 'Vibrant and energetic design with bold colors and dynamic composition'
    };

    const prompt = `Create a professional real estate property flyer with the following specifications:

STYLE: ${templateStyles[template as keyof typeof templateStyles]}

PROPERTY DETAILS:
- Type: ${property.title}
- Location: ${property.location}
- Price: $${property.price?.toLocaleString() || 'Contact for price'}

DESIGN REQUIREMENTS:
- Primary brand color: ${colorPrimary}
- Secondary brand color: ${colorSecondary}
- Include prominent price display
- Include location information
- Modern, clean, professional marketing material
- High contrast and readability
- Space reserved in top-right corner for logo overlay (leave empty/transparent)
- Square format suitable for social media
- No people, no photographer credits
- Focus on architectural elements and property appeal

OUTPUT: Professional real estate marketing flyer, 1024x1024px, suitable for Facebook posting.`;

    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
      style: 'vivid',
    });

    const imageUrl = response.data[0].url;
    if (!imageUrl) throw new Error('No se generó la imagen');

    console.log('✅ Flyer generado con DALL·E 3');
    return NextResponse.json({ success: true, imageUrl });

  } catch (error: any) {
    console.error('❌ Error generando flyer:', error);
    return NextResponse.json(
      { error: error.message || 'Error generando flyer' },
      { status: 500 }
    );
  }
}
