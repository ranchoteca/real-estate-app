import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { property, template, colorPrimary, colorSecondary } = await req.json();

    console.log('🎨 Generando flyer para:', property.title);

    // Mapeo de plantillas a estilos visuales
    const templateStyles = {
      moderna: 'Modern minimalist design with clean geometric shapes and bold typography',
      elegante: 'Elegant luxury real estate design with sophisticated serif fonts and premium feel',
      minimalista: 'Ultra-minimalist design with plenty of white space and simple elements',
      vibrante: 'Vibrant and energetic design with bold colors and dynamic composition'
    };

    // Construir el prompt
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

    console.log('📝 Prompt generado, llamando a DALL-E 3...');

    // Generar imagen con DALL-E 3
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: prompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard', // usa 'hd' si quieres mayor calidad (más caro)
      style: 'vivid', // o 'natural' para un estilo más fotográfico
    });

    const imageUrl = response.data[0].url;
    
    if (!imageUrl) {
      throw new Error('No se generó la imagen');
    }

    console.log('✅ Flyer generado exitosamente');

    return NextResponse.json({
      success: true,
      imageUrl: imageUrl,
    });

  } catch (error: any) {
    console.error('❌ Error generando flyer:', error);
    return NextResponse.json(
      { error: error.message || 'Error generando flyer' },
      { status: 500 }
    );
  }
}