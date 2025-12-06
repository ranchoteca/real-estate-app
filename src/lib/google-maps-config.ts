export const GOOGLE_MAPS_CONFIG = {
  apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
  libraries: ['places', 'geometry', 'geocoding'] as const,
  defaultCenter: {
    lat: 9.7489,
    lng: -83.7534
  },
  defaultZoom: 15
};

export const MAP_STYLES = {
  containerStyle: {
    width: '100%',
    height: '100%'
  }
};

export const MAP_OPTIONS = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: true,
  gestureHandling: 'greedy' as const
};

// 🆕 Configuración de países soportados
export const SUPPORTED_COUNTRIES = [
  {
    code: 'CR',
    name: 'Costa Rica',
    flag: '🇨🇷',
    bounds: {
      north: 11.5,
      south: 8.0,
      east: -82.5,
      west: -86.0
    },
    center: { lat: 9.7489, lng: -83.7534 }
  },
  {
    code: 'PA',
    name: 'Panamá',
    flag: '🇵🇦',
    bounds: {
      north: 9.8,
      south: 7.2,
      east: -77.2,
      west: -83.0
    },
    center: { lat: 8.9824, lng: -79.5199 }
  },
  {
    code: 'DO',
    name: 'República Dominicana',
    flag: '🇩🇴',
    bounds: {
      north: 20.0,
      south: 17.5,
      east: -68.3,
      west: -72.0
    },
    center: { lat: 18.7357, lng: -70.1627 }
  }
] as const;

export type CountryCode = typeof SUPPORTED_COUNTRIES[number]['code'];

// Helper para obtener país por código
export const getCountryByCode = (code: string) => {
  return SUPPORTED_COUNTRIES.find(c => c.code === code);
};

// Helper para validar si coordenadas están dentro del país
export const isLocationInCountry = (
  lat: number, 
  lng: number, 
  countryCode: CountryCode
): boolean => {
  const country = getCountryByCode(countryCode);
  if (!country) return false;
  
  const { bounds } = country;
  return (
    lat >= bounds.south &&
    lat <= bounds.north &&
    lng >= bounds.west &&
    lng <= bounds.east
  );
};