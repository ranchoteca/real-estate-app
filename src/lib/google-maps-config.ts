export const GOOGLE_MAPS_CONFIG = {
  apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
  libraries: ['places', 'geometry'] as const,
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