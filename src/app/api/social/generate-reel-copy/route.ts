// app/api/social/generate-reel-copy/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { supabaseAdmin } from '@/lib/supabase';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { propertyId } = await req.json();
    if (!propertyId) {
      return NextResponse.json({ error: 'propertyId requerido' }, { status: 400 });
    }

    // Obtener agente
    const { data: agent } = await supabaseAdmin
      .from('agents')
      .select('full_name, name, phone')
      .eq('email', session.user.email)
      .single();

    // Obtener propiedad
    const { data: property } = await supabaseAdmin
      .from('properties')
      .select('title, description, price, city, state, listing_type, property_type, language, currency_id')
      .eq('id', propertyId)
      .single();

    if (!property) {
      return NextResponse.json({ error: 'Propiedad no encontrada' }, { status: 404 });
    }

    // Obtener símbolo de moneda
    let currencySymbol = '$';
    if (property.currency_id) {
      const { data: currency } = await supabaseAdmin
        .from('currencies')
        .select('symbol')
        .eq('id', property.currency_id)
        .single();
      if (currency) currencySymbol = currency.symbol;
    }

    const agentName = agent?.full_name || agent?.name || 'Agente inmobiliario';
    const agentPhone = agent?.phone?.replace(/\D/g, '') || '';
    const isSpanish = property.language !== 'en';
    const operationType = property.listing_type === 'rent'
      ? (isSpanish ? 'alquiler' : 'for rent')
      : (isSpanish ? 'venta' : 'for sale');
    const displayPrice = property.price
      ? `${currencySymbol}${Number(property.price).toLocaleString()}`
      : (isSpanish ? 'Precio a consultar' : 'Price upon request');
    const location = [property.city, property.state].filter(Boolean).join(', ');
    const waLink = agentPhone
      ? `https://wa.me/${agentPhone}?text=${encodeURIComponent(isSpanish ? `Hola, me interesa la propiedad: ${property.title}` : `Hello, I'm interested in: ${property.title}`)}`
      : '';

    const prompt = isSpanish ? `
Eres un experto en marketing inmobiliario digital para Costa Rica y América Latina.
Genera DOS copys distintos para publicar un video corto de una propiedad inmobiliaria.
Uno para Facebook Reels y otro para TikTok. Cada uno debe adaptarse al estilo y audiencia de cada plataforma.

DATOS DE LA PROPIEDAD:
- Título: ${property.title}
- Descripción: ${property.description || 'No disponible'}
- Operación: ${operationType}
- Precio: ${displayPrice}
- Ubicación: ${location || 'Costa Rica'}
- Tipo: ${property.property_type || 'propiedad'}
- Agente: ${agentName}
${waLink ? `- WhatsApp: ${waLink}` : ''}

INSTRUCCIONES PARA FACEBOOK REELS:
- Tono aspiracional y descriptivo, como si le hablaras a alguien que sueña con esta propiedad
- 120-180 palabras
- Emojis moderados y estratégicos (no más de 8)
- Precio destacado visualmente
- CTA claro con el link de WhatsApp al final
- 5-8 hashtags agrupados al final, mezcla español e inglés
- Primera línea debe ser un gancho emocional fuerte

INSTRUCCIONES PARA TIKTOK:
- Tono energético, directo, como si hablaras con alguien joven y dinámico
- Máximo 80 palabras, debe leerse en menos de 10 segundos
- Primera línea es un gancho que genera curiosidad o urgencia (ej: "¿Buscas casa en ${location}? 👀")
- Hashtags mezclados dentro del texto estilo TikTok, no todos al final
- Máximo 3-4 emojis, bien ubicados
- CTA muy corto al final (ej: "Link en bio 👆" o "Escríbenos al WhatsApp 👇")
- Sin precio exacto, mejor generar intriga

Responde ÚNICAMENTE con un JSON válido con esta estructura exacta, sin markdown:
{
  "facebook": "copy completo para facebook reels aquí",
  "tiktok": "copy completo para tiktok aquí"
}
` : `
You are a digital real estate marketing expert for Costa Rica and Latin America.
Generate TWO different copies to publish a short property video.
One for Facebook Reels and one for TikTok. Each must adapt to the style and audience of each platform.

PROPERTY DATA:
- Title: ${property.title}
- Description: ${property.description || 'Not available'}
- Operation: ${operationType}
- Price: ${displayPrice}
- Location: ${location || 'Costa Rica'}
- Type: ${property.property_type || 'property'}
- Agent: ${agentName}
${waLink ? `- WhatsApp: ${waLink}` : ''}

INSTRUCTIONS FOR FACEBOOK REELS:
- Aspirational and descriptive tone, as if speaking to someone who dreams of this property
- 120-180 words
- Moderate and strategic emojis (no more than 8)
- Price visually highlighted
- Clear CTA with WhatsApp link at the end
- 5-8 hashtags grouped at the end, mix English and Spanish
- First line must be a strong emotional hook

INSTRUCTIONS FOR TIKTOK:
- Energetic, direct tone, as if speaking to a young dynamic person
- Maximum 80 words, must be readable in under 10 seconds
- First line is a hook that creates curiosity or urgency (e.g., "Looking for a home in ${location}? 👀")
- Hashtags mixed within the text TikTok-style, not all at the end
- Maximum 3-4 emojis, well placed
- Very short CTA at the end (e.g., "Link in bio 👆" or "Message us on WhatsApp 👇")
- No exact price, better to create intrigue

Respond ONLY with a valid JSON with this exact structure, no markdown:
{
  "facebook": "complete copy for facebook reels here",
  "tiktok": "complete copy for tiktok here"
}
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      max_tokens: 800,
    });

    const raw = completion.choices[0].message.content || '{}';
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const copies = JSON.parse(cleaned);

    return NextResponse.json({ facebook: copies.facebook, tiktok: copies.tiktok });

  } catch (error: any) {
    console.error('Error generando copys:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}