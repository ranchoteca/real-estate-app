// Extracts lat/lng coordinates from a Google Maps short URL (maps.app.goo.gl)
// Reused by both calcular-altura and crearPropiedad to avoid code duplication.

export interface Coordinates {
  lat: string;
  lng: string;
}

export async function extractCoordinatesFromMapsUrl(mapsUrl: string): Promise<Coordinates | null> {
  try {
    const response = await fetch(mapsUrl, {
      redirect: 'follow',
      cache: 'no-store',
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        'Accept-Language': 'es-CR,es;q=0.9',
      },
    });

    const finalUrl = response.url;
    const htmlText = await response.text();

    let lat: string | null = null;
    let lng: string | null = null;

    // Strategy 1: extract from expanded URL
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

    // Strategy 2: extract from HTML if URL didn't work
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

    if (!lat || !lng) return null;
    return { lat, lng };
  } catch (err) {
    console.error('[extract-coordinates] Failed to extract from URL:', err);
    return null;
  }
}

// Fallback: geocode by city + state using Google Geocoding API
export async function geocodeByCity(city: string, state?: string): Promise<Coordinates | null> {
  try {
    const query = [city, state, 'Costa Rica'].filter(Boolean).join(', ');
    const apiKey = process.env.NEXT_PUBLIC_ELEVATION_API_KEY;
    const response = await fetch(
      'https://maps.googleapis.com/maps/api/geocode/json?address=' + encodeURIComponent(query) + '&key=' + apiKey,
      { cache: 'no-store' }
    );
    const data = await response.json();
    if (data.status !== 'OK' || !data.results.length) return null;
    const location = data.results[0].geometry.location;
    return { lat: String(location.lat), lng: String(location.lng) };
  } catch (err) {
    console.error('[extract-coordinates] Geocoding failed:', err);
    return null;
  }
}