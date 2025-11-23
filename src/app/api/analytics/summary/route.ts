// app/api/analytics/summary/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { data: agent, error: agentError } = await supabaseAdmin
      .from('agents')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agente no encontrado' }, { status: 404 });
    }

    const { data: properties, error: propertiesError } = await supabaseAdmin
      .from('properties')
      .select(`
        id, slug, title, price, currency_id, property_type, listing_type,
        status, views, city, state, created_at, updated_at, photos,
        show_map, latitude, longitude
      `)
      .eq('agent_id', agent.id);

    if (propertiesError) {
      console.error('Error al obtener propiedades:', propertiesError);
      return NextResponse.json({ error: 'Error al cargar datos' }, { status: 500 });
    }

    const { data: currencies } = await supabaseAdmin
      .from('currencies')
      .select('id, code, symbol, name');

    const currencyMap = new Map(currencies?.map(c => [c.id, c]) || []);

    // 1. INVENTARIO GENERAL
    const totalProperties = properties?.length || 0;
    const activeProperties = properties?.filter(p => p.status === 'active').length || 0;

    const propertiesByCurrency: Record<string, number> = {};
    properties?.forEach(p => {
      if (p.currency_id) {
        const code = currencyMap.get(p.currency_id)?.code || 'N/A';
        propertiesByCurrency[code] = (propertiesByCurrency[code] || 0) + 1;
      }
    });

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentProperties = properties?.filter(p => new Date(p.created_at) >= sevenDaysAgo).length || 0;

    // 2. DISTRIBUCIÓN POR TIPO
    const byPropertyType: Record<string, number> = {};
    properties?.forEach(p => {
      const type = p.property_type || 'unknown';
      byPropertyType[type] = (byPropertyType[type] || 0) + 1;
    });

    // 3. DISTRIBUCIÓN POR LISTING TYPE
    const byListingType: Record<string, number> = {};
    properties?.forEach(p => {
      const type = p.listing_type || 'sale';
      byListingType[type] = (byListingType[type] || 0) + 1;
    });

    // 4. PRECIO PROMEDIO POR DIVISA
    const pricesByCurrency: Record<string, number[]> = {};
    properties?.forEach(p => {
      if (p.price && p.currency_id) {
        const code = currencyMap.get(p.currency_id)?.code || 'N/A';
        if (!pricesByCurrency[code]) pricesByCurrency[code] = [];
        pricesByCurrency[code].push(p.price);
      }
    });

    const averagePriceByCurrency: Record<string, { avg: number; min: number; max: number; symbol: string }> = {};
    Object.keys(pricesByCurrency).forEach(code => {
      const prices = pricesByCurrency[code];
      const sum = prices.reduce((a, b) => a + b, 0);
      const avg = Math.round(sum / prices.length);
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      const currency = currencies?.find(c => c.code === code);
      averagePriceByCurrency[code] = { avg, min, max, symbol: currency?.symbol || '$' };
    });

    // 5. RANGOS DE PRECIO POR DIVISA
    const priceRangesByCurrency: Record<string, Record<string, number>> = {};
    properties?.forEach(p => {
      if (p.price && p.currency_id) {
        const code = currencyMap.get(p.currency_id)?.code || 'N/A';
        if (!priceRangesByCurrency[code]) priceRangesByCurrency[code] = {};
        
        let range = '';
        if (code === 'USD') {
          if (p.price < 100000) range = '$0-$100K';
          else if (p.price < 200000) range = '$100K-$200K';
          else if (p.price < 300000) range = '$200K-$300K';
          else if (p.price < 500000) range = '$300K-$500K';
          else range = '$500K+';
        } else if (code === 'CRC') {
          if (p.price < 50000000) range = '₡0-₡50M';
          else if (p.price < 100000000) range = '₡50M-₡100M';
          else if (p.price < 200000000) range = '₡100M-₡200M';
          else if (p.price < 300000000) range = '₡200M-₡300M';
          else range = '₡300M+';
        } else {
          range = 'Otro';
        }
        priceRangesByCurrency[code][range] = (priceRangesByCurrency[code][range] || 0) + 1;
      }
    });

    // 6. ESTADO DE PROPIEDADES
    const byStatus: Record<string, number> = {};
    properties?.forEach(p => {
      const status = p.status || 'active';
      byStatus[status] = (byStatus[status] || 0) + 1;
    });

    // 7. PROPIEDADES QUE NECESITAN ATENCIÓN (con datos completos)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const propertiesNotUpdated = properties?.filter(p => new Date(p.updated_at) < thirtyDaysAgo) || [];
    const propertiesLessThan5Photos = properties?.filter(p => (p.photos?.length || 0) < 5) || [];
    const propertiesNoMap = properties?.filter(p => p.show_map && (!p.latitude || !p.longitude)) || [];

    const needsAttention = {
      notUpdated30Days: propertiesNotUpdated.length,
      lessThan5Photos: propertiesLessThan5Photos.length,
      noMapLocation: propertiesNoMap.length,
      propertiesNotUpdated: propertiesNotUpdated.map(p => ({
        id: p.id,
        slug: p.slug,
        title: p.title,
        photos: p.photos,
        updated_at: p.updated_at,
      })),
      propertiesLessThan5Photos: propertiesLessThan5Photos.map(p => ({
        id: p.id,
        slug: p.slug,
        title: p.title,
        photos: p.photos,
        photosCount: p.photos?.length || 0,
      })),
      propertiesNoMap: propertiesNoMap.map(p => ({
        id: p.id,
        slug: p.slug,
        title: p.title,
        photos: p.photos,
        city: p.city?.trim(),
        state: p.state?.trim(),
      })),
    };

    // 8. ACTIVIDAD RECIENTE
    const createdLast7Days = properties?.filter(p => new Date(p.created_at) >= sevenDaysAgo).length || 0;
    const updatedLast7Days = properties?.filter(p => 
      new Date(p.updated_at) >= sevenDaysAgo && new Date(p.created_at) < sevenDaysAgo
    ).length || 0;
    const soldLast7Days = properties?.filter(p => 
      p.status === 'sold' && new Date(p.updated_at) >= sevenDaysAgo
    ).length || 0;
    const rentedLast7Days = properties?.filter(p => 
      p.status === 'rented' && new Date(p.updated_at) >= sevenDaysAgo
    ).length || 0;

    // 9. DISTRIBUCIÓN POR UBICACIÓN (Top 5) - CON TRIM
    const byCityState: Record<string, number> = {};
    properties?.forEach(p => {
      const city = p.city?.trim() || '';
      const state = p.state?.trim() || '';
      const location = [city, state].filter(Boolean).join(', ') || 'Sin ubicación';
      byCityState[location] = (byCityState[location] || 0) + 1;
    });

    const topLocations = Object.entries(byCityState)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([location, count]) => ({ location, count }));

    // 10. VISTAS TOTALES
    const totalViews = properties?.reduce((sum, p) => sum + (p.views || 0), 0) || 0;
    const avgViewsPerProperty = totalProperties > 0 ? Math.round(totalViews / totalProperties) : 0;

    return NextResponse.json({
      success: true,
      summary: {
        inventory: {
          total: totalProperties,
          active: activeProperties,
          byCurrency: propertiesByCurrency,
          recentlyAdded: recentProperties,
        },
        distribution: { byPropertyType, byListingType },
        pricing: {
          averageByCurrency: averagePriceByCurrency,
          rangesByCurrency: priceRangesByCurrency,
        },
        status: { byStatus, needsAttention },
        activity: {
          last7Days: {
            created: createdLast7Days,
            updated: updatedLast7Days,
            sold: soldLast7Days,
            rented: rentedLast7Days,
          },
        },
        locations: { topLocations },
        views: {
          total: totalViews,
          average: avgViewsPerProperty,
          threshold: 50,
        },
      },
    });

  } catch (error: any) {
    console.error('❌ Error en analytics:', error);
    return NextResponse.json(
      { error: 'Error al cargar analíticas', details: error.message },
      { status: 500 }
    );
  }
}