import { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';
import PropertyView from './PropertyView';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  // Await params (Next.js 15 requirement)
  const { slug } = await params;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: property } = await supabase
    .from('properties')
    .select('title, description, price, city, state, property_type, listing_type, language, photos, slug, currency_id')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (!property) {
    return {
      title: 'Propiedad no encontrada - FlowEstateAI',
      description: 'La propiedad que buscas no está disponible',
    };
  }

  // Obtener la divisa
  let currencySymbol = '$';
  if (property.currency_id) {
    const { data: currency } = await supabase
      .from('currencies')
      .select('symbol')
      .eq('id', property.currency_id)
      .single();
    
    if (currency) {
      currencySymbol = currency.symbol;
    }
  }

  // Formatear precio
  const priceText = property.price 
    ? `${currencySymbol}${new Intl.NumberFormat('en-US').format(property.price)}`
    : (property.language === 'en' ? 'Price upon request' : 'Precio a consultar');

  // Asegurar que la imagen sea URL absoluta
  const firstPhoto = property.photos?.[0] 
    ? (property.photos[0].startsWith('http') 
        ? property.photos[0] 
        : `https://flowestateai.com${property.photos[0]}`)
    : 'https://flowestateai.com/og-default.jpg';
  
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
  
  // Título mejorado con precio
  const title = `${propertyType} ${listingType}${location ? ' en ' + location : ''} - ${priceText}`;
  
  // Descripción mejorada
  const description = property.description?.substring(0, 155) + '...' || `${propertyType} ${listingType} - ${priceText}`;
  
  const url = `https://flowestateai.com/p/${slug}`;

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
    // Meta tags adicionales para mejor SEO
    alternates: {
      canonical: url,
    },
  };
}

export default function PropertyPage() {
  return <PropertyView />;
}