import { sendQueued } from '@/lib/api/wasender';

interface CalcularAlturaArgs {
  url_google_maps: string;
}

export async function handleCalcularAltura(
  agentId: string,
  cleanNumber: string,
  args: CalcularAlturaArgs,
  messageText: string
): Promise<{ toolResult: object }> {
  const mapsUrl = args.url_google_maps;

  const mensajeContieneUrl = /maps\.app\.goo\.gl|google\.com\/maps|maps\.google\.com/i.test(messageText);

  if (!mensajeContieneUrl) {
    return {
      toolResult: {
        success: false,
        error: 'No se encontró un enlace de Google Maps en el mensaje.',
      },
    };
  }

  await sendQueued(agentId, cleanNumber, '📍 *Procesando ubicación...* Calculando la altitud, dame un segundo.');

  try {
    const responseUrl = await fetch(mapsUrl, {
      redirect: 'follow',
      cache: 'no-store',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        'Accept-Language': 'es-CR,es;q=0.9',
      },
    });

    const finalUrl = responseUrl.url;
    const htmlText = await responseUrl.text();

    let lat: string | null = null;
    let lng: string | null = null;

    // Estrategia 1: URL expandida
    const urlPatterns = [
      /@(-?\d+\.\d+),(-?\d+\.\d+)/,
      /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/,
      /\/place\/[^/]+\/@(-?\d+\.\d+),(-?\d+\.\d+)/,
      /ll=(-?\d+\.\d+),(-?\d+\.\d+)/,
      /center=(-?\d+\.\d+)%2C(-?\d+\.\d+)/,
      /[?&]center=(-?\d+\.\d+),(-?\d+\.\d+)/,
    ];

    for (const pattern of urlPatterns) {
      const m = finalUrl.match(pattern);
      if (m) { lat = m[1]; lng = m[2]; break; }
    }

    // Estrategia 2: HTML
    if (!lat || !lng) {
      const htmlPatterns = [
        /markers=(-?\d+\.\d+)%2C(-?\d+\.\d+)/,
        /markers=(-?\d+\.\d+),(-?\d+\.\d+)/,
        /q=(-?\d+\.\d+)%2C(-?\d+\.\d+)/,
        /\[null,null,(-?\d+\.\d+),(-?\d+\.\d+)\]/,
        /"lat":(-?\d+\.\d+),"lng":(-?\d+\.\d+)/,
        /\["",(-?\d+\.\d+),(-?\d+\.\d+)\]/,
        /\[\[(-?\d+\.\d+),(-?\d+\.\d+)\],null,null,null,null,\[/,
        /APP_INITIALIZATION_STATE=\[.*?(-?\d{1,3}\.\d{4,}),(-?\d{1,3}\.\d{4,})/,
      ];

      for (const pattern of htmlPatterns) {
        const m = htmlText.match(pattern);
        if (m) { lat = m[1]; lng = m[2]; break; }
      }
    }

    if (!lat || !lng) throw new Error('No se pudieron extraer coordenadas del enlace.');

    const apiKey = process.env.NEXT_PUBLIC_ELEVATION_API_KEY;
    const elevationResponse = await fetch(
      `https://maps.googleapis.com/maps/api/elevation/json?locations=${lat},${lng}&key=${apiKey}`,
      { cache: 'no-store' }
    );
    const elevationData = await elevationResponse.json();

    if (elevationData.status !== 'OK' || !elevationData.results.length) {
      throw new Error(`Elevation API status: ${elevationData.status}`);
    }

    const altitud = Math.round(elevationData.results[0].elevation);

    return {
      toolResult: {
        success: true,
        latitud: lat,
        longitud: lng,
        elevacion_metros: altitud,
      },
    };
  } catch (error) {
    console.error('Error al calcular la altitud:', error);
    return {
      toolResult: {
        success: false,
        error: 'No se pudieron extraer coordenadas del enlace proporcionado.',
      },
    };
  }
}