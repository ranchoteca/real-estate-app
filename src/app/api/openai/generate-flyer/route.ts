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

    // 📝 Visual styles
    const visualStyles = {
      moderna: 'modern minimalist design with clean geometric shapes and contemporary architecture',
      elegante: 'elegant luxury design with sophisticated premium aesthetics and refined details',
      minimalista: 'ultra-minimalist design with maximum white space and simple visual hierarchy',
      vibrante: 'vibrant energetic design with bold colors and dynamic visual elements',
    };

    const style = visualStyles[template as keyof typeof visualStyles] || visualStyles.moderna;

    // Obtener la primera foto de la propiedad
    const propertyImage = property.photos && property.photos.length > 0 ? property.photos[0] : null;

    // 🎨 Instruction for GPT-5 in English
    const instruction = `
Create a professional real estate digital art graphic for social media (Facebook post) with these exact specifications:

PROPERTY INFORMATION:
- Property Name: ${property.title}
- Location: ${property.location || 'Location available'}
- Price: ${property.price ? `${Number(property.price).toLocaleString()}` : 'Contact for price'}
${propertyImage ? `- Property Photo URL: ${propertyImage}` : ''}

VISUAL STYLE: ${style}

BRAND COLORS (MUST USE EXACTLY):
- Primary Color: ${colorPrimary} - use for the property name/title
- Secondary Color: ${colorSecondary} - use for location text and decorative elements

DESIGN REQUIREMENTS:
1. Format: Square 1024x1024px perfect for Facebook
2. Layout structure:
   ${logoUrl ? '- Top-left corner: Clean light area reserved for company logo overlay (140x140px space)' : '- Top section: Clean modern header'}
   - Center/Upper area: Property name in LARGE bold typography (color: ${colorPrimary})
   - Middle: Location text with pin/map icon (color: ${colorSecondary})
   - Lower area: Price displayed prominently (color: ${colorPrimary})
3. Background: Subtle architectural or abstract design elements that don't compete with text
4. Typography: Professional, modern, highly readable fonts
5. Overall aesthetic: Premium real estate marketing material
6. NO people, NO magazine covers - this is digital art for social media
7. High contrast for excellent readability
8. The brand colors should be the dominant visual elements

Create a clean, professional digital art piece that looks like modern real estate marketing content for social media.
    `.trim();

    console.log('🤖 Llamando a GPT-5 con Responses API...');

    // 🚀 Use GPT-5 Responses API
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

    // Extract generated image URL
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