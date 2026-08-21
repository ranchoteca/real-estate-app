'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import { useI18nStore } from '@/lib/i18n-store';
import { fetchElevationFromServer } from '@/app/actions/elevation';

import { 
  GOOGLE_MAPS_CONFIG, 
  MAP_STYLES, 
  MAP_OPTIONS 
} from '@/lib/google-maps-config';

interface CalculateAltitudeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_CENTER = { lat: 9.7489, lng: -83.7534 };

export default function CalculateAltitudeModal({ isOpen, onClose }: CalculateAltitudeModalProps) {
  const { language } = useI18nStore();
  
  const [position, setPosition] = useState<google.maps.LatLngLiteral>(DEFAULT_CENTER);
  const [altitude, setAltitude] = useState<number | null>(null);
  const [loadingAltitude, setLoadingAltitude] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  
  const mapRef = useRef<google.maps.Map | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_CONFIG.apiKey,
    libraries: GOOGLE_MAPS_CONFIG.libraries,
  });

  const calculateElevation = useCallback(async (location: google.maps.LatLngLiteral) => {
    setLoadingAltitude(true);
    setSearchError(null);
    try {
      const result = await fetchElevationFromServer(location.lat, location.lng);
      if (result.success && result.elevation !== undefined) {
        setAltitude(result.elevation);
      } else {
        setAltitude(null);
        setSearchError(language === 'en' ? `API Error: ${result.error}` : `Error de API: ${result.error}`);
      }
    } catch (err) {
      console.error("Error ejecutando fetch de elevación:", err);
      setAltitude(null);
      setSearchError(language === 'en' ? 'Error connecting to the Elevation API.' : 'Error conectando con la Elevation API.');
    } finally {
      setLoadingAltitude(false);
    }
  }, [language]);

  useEffect(() => {
    if (isOpen && isLoaded) calculateElevation(position);
  }, [isOpen, isLoaded, calculateElevation]);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const newPos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      setPosition(newPos);
      calculateElevation(newPos);
    }
  }, [calculateElevation]);

  const handleMarkerDragEnd = useCallback((e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const newPos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      setPosition(newPos);
      calculateElevation(newPos);
    }
  }, [calculateElevation]);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() || !isLoaded) return;
    setSearching(true);
    setSearchError(null);
    try {
      const geocoder = new google.maps.Geocoder();
      const result = await geocoder.geocode({ 
        address: searchQuery,
        componentRestrictions: { country: 'CR' }
      });
      if (result.results && result.results.length > 0) {
        const location = result.results[0].geometry.location;
        const newPos = { lat: location.lat(), lng: location.lng() };
        setPosition(newPos);
        calculateElevation(newPos);
        if (mapRef.current) { mapRef.current.panTo(newPos); mapRef.current.setZoom(14); }
      } else {
        setSearchError(language === 'en' ? 'Location not found' : 'Ubicación no encontrada');
      }
    } catch (err) {
      setSearchError(language === 'en' ? 'Search error' : 'Error en la búsqueda');
    } finally {
      setSearching(false);
    }
  }, [searchQuery, isLoaded, language, calculateElevation]);

  const handleCopyAltitude = () => {
    if (altitude !== null) {
      navigator.clipboard.writeText(`${altitude} metros sobre el nivel del mar`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(27,45,91,0.6)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="w-full max-w-lg shadow-2xl overflow-hidden flex flex-col rounded-2xl"
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E8E4DC',
          height: '85vh',
          maxHeight: '800px',
        }}
      >
        {/* Header */}
        <div
          className="px-5 py-4 flex justify-between items-center flex-shrink-0"
          style={{ borderBottom: '1px solid #E8E4DC', backgroundColor: '#1B2D5B' }}
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">🏔️</span>
            <h3 className="text-base font-bold text-white">
              {language === 'en' ? 'Calculate Altitude' : 'Calcular Altura'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors active:scale-90"
            style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: '#FFFFFF' }}
          >
            ✕
          </button>
        </div>

        {/* Buscador */}
        <div className="p-4 flex-shrink-0" style={{ backgroundColor: '#F8F6F2', borderBottom: '1px solid #E8E4DC' }}>
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder={language === 'en' ? 'Ex: Tamarindo, Guanacaste' : 'Ej: Tamarindo, Guanacaste'}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm focus:outline-none"
                style={{ border: '1.5px solid #E8E4DC', backgroundColor: '#FFFFFF', color: '#1A1A2E' }}
              />
              <button
                onClick={handleSearch}
                disabled={searching || !searchQuery.trim()}
                className="px-4 py-2.5 rounded-xl font-bold text-sm active:scale-95 transition-all disabled:opacity-50"
                style={{ backgroundColor: '#1B2D5B', color: '#FFFFFF' }}
              >
                {searching ? '⏳' : '🔍'}
              </button>
            </div>
            {searchError && (
              <p className="text-xs font-semibold px-3 py-2 rounded-lg" style={{ backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>
                ⚠️ {searchError}
              </p>
            )}
            <p className="text-xs" style={{ color: '#6B7280' }}>
              {language === 'en' ? 'Search, move the pin, or tap on the map.' : 'Busca, mueve el pin o toca en el mapa.'}
            </p>
          </div>
        </div>

        {/* Mapa */}
        <div className="flex-1 relative min-h-[200px]" style={{ borderBottom: '1px solid #E8E4DC' }}>
          {loadError ? (
            <div className="absolute inset-0 flex items-center justify-center text-sm font-bold" style={{ color: '#DC2626' }}>
              {language === 'en' ? 'Error loading Google Maps' : 'Error al cargar Google Maps'}
            </div>
          ) : !isLoaded ? (
            <div className="absolute inset-0 flex items-center justify-center text-sm font-bold animate-pulse" style={{ color: '#6B7280' }}>
              {language === 'en' ? 'Loading map...' : 'Cargando mapa...'}
            </div>
          ) : (
            <GoogleMap
              mapContainerStyle={MAP_STYLES.containerStyle}
              center={position}
              zoom={7}
              options={{ ...MAP_OPTIONS, draggableCursor: 'crosshair' }}
              onClick={handleMapClick}
              onLoad={onMapLoad}
            >
              <Marker position={position} draggable={true} onDragEnd={handleMarkerDragEnd} />
            </GoogleMap>
          )}
        </div>

        {/* Footer — resultado */}
        <div className="p-4 flex-shrink-0" style={{ backgroundColor: '#FFFFFF' }}>
          <div
            className="flex items-center justify-between rounded-xl p-4"
            style={{ backgroundColor: '#F5EDD8', border: '1px solid rgba(201,168,76,0.35)' }}
          >
            <div>
              <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: '#6B7280' }}>
                {language === 'en' ? 'Estimated altitude:' : 'Altitud estimada:'}
              </p>
              <div className="text-2xl font-bold font-mono" style={{ color: '#1B2D5B' }}>
                {loadingAltitude ? (
                  <span className="text-sm font-sans animate-pulse" style={{ color: '#6B7280' }}>
                    ⏳ {language === 'en' ? 'Calculating...' : 'Calculando...'}
                  </span>
                ) : altitude !== null ? (
                  `${altitude} m.s.n.m.`
                ) : (
                  <span className="text-sm font-sans" style={{ color: '#6B7280' }}>--</span>
                )}
              </div>
            </div>
            <button
              onClick={handleCopyAltitude}
              disabled={altitude === null || loadingAltitude}
              className="px-4 py-2.5 rounded-xl font-bold text-sm active:scale-95 transition-all disabled:opacity-40"
              style={{
                background: copied
                  ? 'linear-gradient(135deg, #15803D 0%, #16A34A 100%)'
                  : 'linear-gradient(135deg, #C9A84C 0%, #E8C96A 100%)',
                color: copied ? '#FFFFFF' : '#1B2D5B',
              }}
            >
              {copied
                ? (language === 'en' ? '✓ Copied!' : '✓ ¡Copiado!')
                : (language === 'en' ? 'Copy' : 'Copiar')}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}