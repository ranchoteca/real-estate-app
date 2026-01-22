import { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';

export async function generatePropertyMetadata(slug: string): Promise<Metadata> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: property } = await supabase
      .from('properties')
      .select(`
        id,
        title,
        description,
        price,
        currency_id,
        city,
        state,
        property_type,
        listing_type,
        language,
        photos,
        slug
      `)
      .eq('slug', slug)
      .eq('status', 'published')
      .single();

    if (!property) {
      return {
        title: 'Propiedad no encontrada',
      };
    }

    const firstPhoto = property.photos?.[0] || 'https://flowestateai.com/default-property.jpg';
    const listingTypeText = property.listing_type === 'rent' 
      ? (property.language === 'en' ? 'For Rent' : 'En Alquiler')
      : (property.language === 'en' ? 'For Sale' : 'En Venta');
    
    const propertyTypeTranslations: Record<string, Record<'es' | 'en', string>> = {
      house: { es: 'Casa', en: 'House' },
      condo: { es: 'Condominio', en: 'Condo' },
      apartment: { es: 'Apartamento', en: 'Apartment' },
      land: { es: 'Terreno', en: 'Land' },
      commercial: { es: 'Comercial', en: 'Commercial' },
    };
    
    const propertyTypeText = property.property_type 
      ? (propertyTypeTranslations[property.property_type]?.[property.language] || property.property_type)
      : '';

    const location = [property.city, property.state].filter(Boolean).join(', ');
    const ogTitle = `${propertyTypeText} ${listingTypeText}${location ? ' - ' + location : ''}`;
    const ogDescription = property.description?.substring(0, 160) || property.title;
    const ogUrl = `https://flowestateai.com/p/${property.slug}`;

    return {
      title: ogTitle,
      description: ogDescription,
      openGraph: {
        title: ogTitle,
        description: ogDescription,
        url: ogUrl,
        siteName: 'FlowEstateAI',
        images: [
          {
            url: firstPhoto,
            width: 1200,
            height: 630,
            alt: property.title,
          },
        ],
        locale: property.language === 'es' ? 'es_ES' : 'en_US',
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: ogTitle,
        description: ogDescription,
        images: [firstPhoto],
      },
    };
  } catch (error) {
    console.error('Error generando metadata:', error);
    return {
      title: 'FlowEstateAI',
    };
  }
}