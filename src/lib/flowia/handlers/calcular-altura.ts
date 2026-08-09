import { sendQueued } from '@/lib/api/wasender';
import { extractCoordinatesFromMapsUrl } from '../media/extract-coordinates';

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
    const coords = await extractCoordinatesFromMapsUrl(mapsUrl);

    if (!coords) {
      throw new Error('No se pudieron extraer coordenadas del enlace.');
    }

    const { lat, lng } = coords;
    const apiKey = process.env.NEXT_PUBLIC_ELEVATION_API_KEY;
    const elevationResponse = await fetch(
      'https://maps.googleapis.com/maps/api/elevation/json?locations=' + lat + ',' + lng + '&key=' + apiKey,
      { cache: 'no-store' }
    );
    const elevationData = await elevationResponse.json();

    if (elevationData.status !== 'OK' || !elevationData.results.length) {
      throw new Error('Elevation API status: ' + elevationData.status);
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