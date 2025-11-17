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

    // Obtener agente
    const { data: agent, error: agentError } = await supabaseAdmin
      .from('agents')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agente no encontrado' }, { status: 404 });
    }

    // Obtener todas las propiedades con su divisa
    const { data: properties, error: propertiesError } = await supabaseAdmin
      .from('properties')
      .select(`
        id,
        price,
        currency_id,
        property_type,
        listing_type,
        status,
        views,
        city,
        state,
        created_at,
        updated_at,
        photos,
        show_map,
        latitude,
        longitude
      `)
      .eq('agent_id', agent.id);

    if (propertiesError) {
      console.error('Error al obtener propiedades:', propertiesError);
      return NextResponse.json({ error: 'Error al cargar datos' }, { status: 500 });
    }

    // Obtener información de divisas
    const { data: currencies } = await supabaseAdmin
      .from('currencies')
      .select('id, code, symbol, name');

    const currencyMap = new Map(currencies?.map(c => [c.id, c]) || []);

    // CÁLCULOS

    // 1. INVENTARIO GENERAL
    const totalProperties = properties?.length || 0;
    const activeProperties = properties?.filter(p => p.status === 'active').length || 0;

    // Contar por divisa
    const propertiesByCurrency: Record<string, number> = {};
    properties?.forEach(p => {
      if (p.currency_id) {
        const code = currencyMap.get(p.currency_id)?.code || 'N/A';
        propertiesByCurrency[code] = (propertiesByCurrency[code] || 0) + 1;
      }
    });

    // Propiedades agregadas últimos 7 días
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
      const symbol = currencyMap.get(properties?.find(p => currencyMap.get(p.currency_id!)?.code === code)?.currency_id!)?.symbol || '$';
      
      averagePriceByCurrency[code] = { avg, min, max, symbol };
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

    // 7. PROPIEDADES QUE NECESITAN ATENCIÓN
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const needsAttention = {
      notUpdated30Days: properties?.filter(p => new Date(p.updated_at) < thirtyDaysAgo).length || 0,
      lessThan5Photos: properties?.filter(p => (p.photos?.length || 0) < 5).length || 0,
      noMapLocation: properties?.filter(p => p.show_map && (!p.latitude || !p.longitude)).length || 0,
    };

    // 8. ACTIVIDAD RECIENTE (últimos 7 días)
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

    // 9. DISTRIBUCIÓN POR UBICACIÓN
    const byCityState: Record<string, number> = {};
    properties?.forEach(p => {
      const location = [p.city, p.state].filter(Boolean).join(', ') || 'Sin ubicación';
      byCityState[location] = (byCityState[location] || 0) + 1;
    });

    // Top 5 ubicaciones
    const topLocations = Object.entries(byCityState)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([location, count]) => ({ location, count }));

    // 10. VISTAS TOTALES
    const totalViews = properties?.reduce((sum, p) => sum + (p.views || 0), 0) || 0;
    const avgViewsPerProperty = totalProperties > 0 ? Math.round(totalViews / totalProperties) : 0;

    // Respuesta
    return NextResponse.json({
      success: true,
      summary: {
        inventory: {
          total: totalProperties,
          active: activeProperties,
          byCurrency: propertiesByCurrency,
          recentlyAdded: recentProperties,
        },
        distribution: {
          byPropertyType,
          byListingType,
        },
        pricing: {
          averageByCurrency: averagePriceByCurrency,
          rangesByCurrency: priceRangesByCurrency,
        },
        status: {
          byStatus,
          needsAttention,
        },
        activity: {
          last7Days: {
            created: createdLast7Days,
            updated: updatedLast7Days,
            sold: soldLast7Days,
            rented: rentedLast7Days,
          },
        },
        locations: {
          topLocations,
        },
        views: {
          total: totalViews,
          average: avgViewsPerProperty,
          threshold: 50, // Para desbloquear analytics avanzados
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