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

    console.log('🎨 Generando flyer digital para:', property.title);
    console.log('🎨 Colores:', { colorPrimary, colorSecondary });
    console.log('🏷️ Logo:', logoUrl || 'Sin logo');

    // 📝 Estilos de plantillas
    const templateStyles = {
      moderna: 'Modern, clean, minimalist design with geometric shapes and bold sans-serif typography',
      elegante: 'Elegant, sophisticated luxury design with premium aesthetics and refined serif fonts',
      minimalista: 'Ultra-minimalist with maximum white space, simple layout, and subtle hierarchy',
      vibrante: 'Bold, energetic design with high contrast, vibrant accents, and dynamic composition',
    };

    const selectedStyle = templateStyles[template as keyof typeof templateStyles] || templateStyles.moderna;

    // 🎨 Prompt detallado para DALL-E 3
    const prompt = `
Create a professional real estate marketing flyer design:

PROPERTY DETAILS:
- Title: "${property.title}"
- Location: "${property.location || 'Location available'}"
- Price: "${property.price ? `$${Number(property.price).toLocaleString()}` : 'Contact for price'}"

DESIGN STYLE: ${selectedStyle}

BRAND COLORS (USE EXACTLY):
- Primary: ${colorPrimary} - for main title and key elements
- Secondary: ${colorSecondary} - for location text and accents

LAYOUT REQUIREMENTS:
- Square 1024x1024px format for Facebook
- Top section: ${logoUrl ? 'Space for company logo (light background area, top-left corner)' : 'Clean header area'}
- Main content centered or upper-center:
  * Property title in LARGE bold text (${colorPrimary})
  * Location with pin icon in medium text (${colorSecondary})
  * Price prominently displayed (${colorPrimary})
- Background: Subtle architectural/real estate imagery that doesn't compete with text
- Professional, modern, clean aesthetic
- High contrast for readability
- No people, focus on design and architecture

The flyer should look like premium real estate marketing material, with clear visual hierarchy and the brand colors integrated throughout the design.
    `.trim();

    console.log('🤖 Generando con DALL-E 3...');

    // 🚀 Generar con DALL-E 3
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt,
      size: '1024x1024',
      quality: 'hd',
      style: 'natural',
      n: 1,
    });

    const imageUrl = response.data[0]?.url;
    
    if (!imageUrl) {
      throw new Error('No se generó la imagen');
    }

    console.log('✅ Flyer generado exitosamente');

    return NextResponse.json({
      success: true,
      imageUrl,
      source: 'dalle-3',
      template,
      colors: {
        primary: colorPrimary,
        secondary: colorSecondary,
      },
    });

  } catch (error: any) {
    console.error('❌ Error generando flyer:', error);
    
    if (error.response) {
      console.error('OpenAI Error:', error.response.data);
    }

    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Error generando flyer',
      },
      { status: 500 }
    );
  }
}