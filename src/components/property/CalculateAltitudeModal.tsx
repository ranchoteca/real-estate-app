'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import { useI18nStore } from '@/lib/i18n-store';
import { fetchElevationFromServer } from '@/app/actions/elevation';

// Importamos tu configuración exacta para que el mapa cargue sin problemas
import { 
  GOOGLE_MAPS_CONFIG, 
  MAP_STYLES, 
  MAP_OPTIONS 
} from '@/lib/google-maps-config';

interface CalculateAltitudeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_CENTER = { lat: 9.7489, lng: -83.7534 }; // Centro de Costa Rica

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

  // Cargamos el script exactamente igual que en tu GoogleMapEditor
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_CONFIG.apiKey,
    libraries: GOOGLE_MAPS_CONFIG.libraries,
  });

  // Función modificada para llamar al Server Action (Backend) y evitar CORS
  const calculateElevation = useCallback(async (location: google.maps.LatLngLiteral) => {
    setLoadingAltitude(true);
    setSearchError(null); // Limpiamos errores previos en cada intento
    
    try {
      // Usamos el Server Action que inyecta la llave de forma segura en el servidor
      const result = await fetchElevationFromServer(location.lat, location.lng);
      
      if (result.success && result.elevation !== undefined) {
        setAltitude(result.elevation);
      } else {
        setAltitude(null);
        setSearchError(
          language === 'en' 
            ? `API Error: ${result.error}` 
            : `Error de API: ${result.error}`
        );
      }
    } catch (err) {
      console.error("Error ejecutando fetch de elevación:", err);
      setAltitude(null);
      setSearchError(
        language === 'en' 
          ? 'Error connecting to the Elevation API.' 
          : 'Error conectando con la Elevation API.'
      );
    } finally {
      setLoadingAltitude(false);
    }
  }, [language]);

  // Calcular altitud inicial si el mapa ya cargó y el modal se abre
  useEffect(() => {
    if (isOpen && isLoaded) {
      calculateElevation(position);
    }
  }, [isOpen, isLoaded, calculateElevation]);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  // Al hacer clic en el mapa
  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const newPos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      setPosition(newPos);
      calculateElevation(newPos);
    }
  }, [calculateElevation]);

  // Al soltar el pin después de arrastrarlo
  const handleMarkerDragEnd = useCallback((e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const newPos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      setPosition(newPos);
      calculateElevation(newPos);
    }
  }, [calculateElevation]);

  // Buscador usando Geocoder
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
        
        if (mapRef.current) {
          mapRef.current.panTo(newPos);
          mapRef.current.setZoom(14);
        }
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col h-[85vh] max-h-[800px]">
        
        {/* Header */}
        <div className="px-5 py-4 border-b flex justify-between items-center" style={{ borderColor: '#E5E7EB' }}>
          <h3 className="text-lg font-bold" style={{ color: '#0F172A' }}>
            🏔️ {language === 'en' ? 'Calculate Altitude' : 'Calcular Altura'}
          </h3>
          <button onClick={onClose} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full active:scale-90 transition-transform">
            ✕
          </button>
        </div>

        {/* Buscador */}
        <div className="p-4" style={{ backgroundColor: '#F9FAFB' }}>
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder={language === 'en' ? 'Ex: Tamarindo, Guanacaste' : 'Ej: Tamarindo, Guanacaste'}
                className="flex-1 px-4 py-2.5 rounded-xl border-2 focus:outline-none text-sm"
                style={{ borderColor: '#E5E7EB', backgroundColor: '#FFFFFF', color: '#0F172A' }}
              />
              <button
                onClick={handleSearch}
                disabled={searching || !searchQuery.trim()}
                className="px-4 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all active:scale-95 text-sm"
              >
                {searching ? '⏳' : '🔍'}
              </button>
            </div>
            {searchError && (
              <p className="text-xs text-red-500 font-bold bg-red-50 p-2 rounded-lg border border-red-100 animate-pulse">
                ⚠️ {searchError}
              </p>
            )}
            <p className="text-xs opacity-60" style={{ color: '#0F172A' }}>
              {language === 'en' ? 'Search, move the pin, or tap on the map.' : 'Busca, mueve el pin o toca en el mapa.'}
            </p>
          </div>
        </div>

        {/* Mapa */}
        <div className="flex-1 relative bg-gray-100 border-y border-gray-200 min-h-[300px]">
          {loadError ? (
            <div className="absolute inset-0 flex items-center justify-center text-red-500 text-sm font-bold">
              Error al cargar Google Maps
            </div>
          ) : !isLoaded ? (
            <div className="absolute inset-0 flex items-center justify-center text-gray-500 animate-pulse text-sm font-bold">
              Cargando mapa...
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
              <Marker
                position={position}
                draggable={true}
                onDragEnd={handleMarkerDragEnd}
              />
            </GoogleMap>
          )}
        </div>

        {/* Footer con Resultado */}
        <div className="p-5 bg-white">
          <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-xl p-4">
            <div>
              <p className="text-xs font-semibold text-blue-900 mb-1">
                {language === 'en' ? 'Estimated altitude:' : 'Altitud estimada:'}
              </p>
              <div className="text-2xl font-bold text-blue-700 font-mono">
                {loadingAltitude ? (
                  <span className="text-sm font-sans animate-pulse">⏳ Calculando...</span>
                ) : altitude !== null ? (
                  `${altitude} m.s.n.m.`
                ) : (
                  <span className="text-sm font-sans text-gray-400">--</span>
                )}
              </div>
            </div>
            
            <button
              onClick={handleCopyAltitude}
              disabled={altitude === null || loadingAltitude}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition-all active:scale-95 disabled:opacity-50 shadow-sm"
            >
              {copied ? (language === 'en' ? '¡Copied!' : '¡Copiado!') : (language === 'en' ? 'Copy' : 'Copiar')}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}