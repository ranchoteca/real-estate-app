import { supabaseAdmin } from '@/lib/supabase';
import { CURRENCY_MAP } from '../constants';

interface BuscarArgs {
  termino_busqueda?: string;
  precio_min?: number;
  precio_max?: number;
  moneda_referencia?: string;
  tipo_transaccion?: string;
}

const PROPERTIES_PER_PAGE = 5;

export async function handleBuscarPropiedades(
  agentId: string,
  args: BuscarArgs
): Promise<{ toolResult: object; slugParaPdf: string | null }> {
  let query = supabaseAdmin
    .from('properties')
    .select('id, title, description, price, currency_id, city, address, slug, property_type, listing_type, status', {
      count: 'exact',
    })
    .eq('agent_id', agentId)
    .eq('status', 'active');

  if (args.termino_busqueda) {
    query = query.or(
      `title.ilike.%${args.termino_busqueda}%,description.ilike.%${args.termino_busqueda}%,city.ilike.%${args.termino_busqueda}%,address.ilike.%${args.termino_busqueda}%`
    );
  }

  if (args.tipo_transaccion) {
    query = query.eq('listing_type', args.tipo_transaccion === 'alquiler' ? 'rent' : 'sale');
  }

  if (args.precio_min !== undefined || args.precio_max !== undefined) {
    if (args.precio_min !== undefined) query = query.gte('price', args.precio_min);
    if (args.precio_max !== undefined) query = query.lte('price', args.precio_max);
  }

  query = query.order('created_at', { ascending: false }).limit(PROPERTIES_PER_PAGE);

  const { data: properties, count, error } = await query;

  if (error || !properties) {
    return {
      toolResult: { success: false, error: 'Error consultando propiedades.' },
      slugParaPdf: null,
    };
  }

  if (properties.length === 0) {
    return {
      toolResult: {
        success: true,
        total_encontradas: 0,
        propiedades_mostradas: 0,
        propiedades: [],
      },
      slugParaPdf: null,
    };
  }

  const BASE_DOMAIN = 'https://www.flowestateai.com';

  const propiedadesFormateadas = properties.map((p) => {
    const currencyInfo = p.currency_id ? CURRENCY_MAP[p.currency_id] : null;
    return {
      title: p.title,
      description: p.description ? p.description.substring(0, 150) + '...' : '',
      price: p.price,
      currency_symbol: currencyInfo?.symbol || '$',
      currency_code: currencyInfo?.code || 'USD',
      city: p.city,
      address: p.address,
      property_type: p.property_type,
      listing_type: p.listing_type,
      slug: p.slug,
      property_url: `${BASE_DOMAIN}/p/${p.slug}`,
    };
  });

  const slugParaPdf = properties.length === 1 ? properties[0].slug : null;

  return {
    toolResult: {
      success: true,
      total_encontradas: count || properties.length,
      propiedades_mostradas: properties.length,
      propiedades: propiedadesFormateadas,
    },
    slugParaPdf,
  };
}