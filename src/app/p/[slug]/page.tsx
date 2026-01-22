import { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';
import PropertyView from './PropertyView';

export async function generateMetadata({ 
  params 
}: { 
  params: { slug: string } 
}): Promise<Metadata> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: property } = await supabase
    .from('properties')
    .select('title, description, price, city, state, property_type, listing_type, language, photos, slug')
    .eq('slug', params.slug)
    .eq('status', 'published')
    .single();

  if (!property) {
    return {
      title: 'Propiedad no encontrada - FlowEstateAI',
    };
  }

  const firstPhoto = property.photos?.[0] || 'https://flowestateai.com/og-default.jpg';
  
  const listingType = property.listing_type === 'rent' 
    ? (property.language === 'en' ? 'For Rent' : 'En Alquiler')
    : (property.language === 'en' ? 'For Sale' : 'En Venta');
  
  const propertyTypes: Record<string, Record<string, string>> = {
    house: { es: 'Casa', en: 'House' },
    condo: { es: 'Condominio', en: 'Condo' },
    apartment: { es: 'Apartamento', en: 'Apartment' },
    land: { es: 'Terreno', en: 'Land' },
    commercial: { es: 'Comercial', en: 'Commercial' },
  };
  
  const propertyType = property.property_type 
    ? (propertyTypes[property.property_type]?.[property.language] || property.property_type)
    : '';

  const location = [property.city, property.state].filter(Boolean).join(', ');
  const title = `${propertyType} ${listingType}${location ? ' - ' + location : ''}`;
  const description = property.description?.substring(0, 160) || property.title;
  const url = `https://flowestateai.com/p/${property.slug}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: 'FlowEstateAI',
      images: [{
        url: firstPhoto,
        width: 1200,
        height: 630,
        alt: property.title,
      }],
      locale: property.language === 'es' ? 'es_ES' : 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [firstPhoto],
    },
  };
}

export default function PropertyPage() {
  return <PropertyView />;
}