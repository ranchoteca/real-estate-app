'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import { GOOGLE_MAPS_CONFIG, MAP_STYLES, MAP_OPTIONS } from '@/lib/google-maps-config';

interface GoogleMapEditorProps {
  address: string;
  city: string;
  state: string;
  initialLat?: number | null;
  initialLng?: number | null;
  initialPlusCode?: string | null;
  onLocationChange: (lat: number, lng: number, plusCode: string) => void;
  editable?: boolean;
}

export default function GoogleMapEditor({
  address,
  city,
  state,
  initialLat,
  initialLng,
  initialPlusCode,
  onLocationChange,
  editable = true,
}: GoogleMapEditorProps) {
  const [position, setPosition] = useState<google.maps.LatLngLiteral | null>(null);
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [plusCode, setPlusCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gpsUsed, setGpsUsed] = useState(false);
  const [plusCodeSuccess, setPlusCodeSuccess] = useState(false);
  const [coordsSuccess, setCoordsSuccess] = useState(false);
  const [coordsError, setCoordsError] = useState(false);
  
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_CONFIG.apiKey,
    libraries: GOOGLE_MAPS_CONFIG.libraries,
  });

  // Generar Plus Code desde coordenadas
  const generatePlusCode = useCallback((lat: number, lng: number): string => {
    try {
      if (window.google?.maps?.computeOffset) {
        // Google Maps tiene su propia implementación de Plus Codes
        const plusCode = `${lat.toFixed(6)},${lng.toFixed(6)}`;
        return plusCode;
      }
      return `${lat.toFixed(6)},${lng.toFixed(6)}`;
    } catch (err) {
      console.error('Error generando Plus Code:', err);
      return `${lat.toFixed(6)},${lng.toFixed(6)}`;
    }
  }, []);

  // Decodificar Plus Code a coordenadas
  const decodePlusCode = useCallback((code: string): google.maps.LatLngLiteral | null => {
    try {
      if (code.includes(',') && !code.includes('+')) {
        const [lat, lng] = code.split(',').map(s => parseFloat(s.trim()));
        if (!isNaN(lat) && !isNaN(lng)) {
          return { lat, lng };
        }
      }
      return null;
    } catch (err) {
      console.error('Error decodificando Plus Code:', err);
      return null;
    }
  }, []);

  // Geocoding usando Google Maps API
  const geocodeAddress = useCallback(async (
    address: string,
    city: string,
    state: string
  ): Promise<google.maps.LatLngLiteral | null> => {
    if (!isLoaded) return null;
    
    try {
      const query = `${address}, ${city}, ${state}`.trim();
      if (!query || query === ', , ') return null;

      const geocoder = new google.maps.Geocoder();
      const result = await geocoder.geocode({ address: query });

      if (result.results && result.results.length > 0) {
        const location = result.results[0].geometry.location;
        return {
          lat: location.lat(),
          lng: location.lng()
        };
      }

      return null;
    } catch (error) {
      console.error('Error en geocoding:', error);
      return null;
    }
  }, [isLoaded]);

  // Calcular distancia entre dos puntos
  const calculateDistance = useCallback((
    coords1: google.maps.LatLngLiteral,
    coords2: google.maps.LatLngLiteral
  ): number => {
    const R = 6371; // Radio de la Tierra en km
    const dLat = ((coords2.lat - coords1.lat) * Math.PI) / 180;
    const dLon = ((coords2.lng - coords1.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((coords1.lat * Math.PI) / 180) *
        Math.cos((coords2.lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }, []);

  // Inicializar ubicación
  useEffect(() => {
    if (!isLoaded) return;

    const initializeLocation = async () => {
      setLoading(true);
      setError(null);

      // Si hay coordenadas iniciales, usarlas
      if (initialLat && initialLng) {
        const coords: google.maps.LatLngLiteral = { lat: initialLat, lng: initialLng };
        const code = initialPlusCode || generatePlusCode(initialLat, initialLng);
        
        setPosition(coords);
        setManualLat(initialLat.toFixed(6));
        setManualLng(initialLng.toFixed(6));
        setPlusCode(code);
        setLoading(false);
        return;
      }

      // Si hay Plus Code inicial, decodificarlo
      if (initialPlusCode) {
        const coords = decodePlusCode(initialPlusCode);
        if (coords) {
          setPosition(coords);
          setManualLat(coords.lat.toFixed(6));
          setManualLng(coords.lng.toFixed(6));
          setPlusCode(initialPlusCode);
          onLocationChange(coords.lat, coords.lng, initialPlusCode);
          setLoading(false);
          return;
        }
      }

      // Intentar GPS primero (solo en modo edición)
      if (navigator.geolocation && editable) {
        try {
          const gpsPosition = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 5000,
              maximumAge: 0,
            });
          });

          const gpsCoords: google.maps.LatLngLiteral = {
            lat: gpsPosition.coords.latitude,
            lng: gpsPosition.coords.longitude,
          };

          const code = generatePlusCode(gpsCoords.lat, gpsCoords.lng);
          const geocodedCoords = await geocodeAddress(address, city, state);

          if (geocodedCoords) {
            const distance = calculateDistance(gpsCoords, geocodedCoords);

            if (distance > 1) {
              setError(`⚠️ Tu ubicación está a ${distance.toFixed(1)}km de la dirección. Ajusta el pin en el mapa.`);
            } else {
              setGpsUsed(true);
            }

            setPosition(gpsCoords);
            setManualLat(gpsCoords.lat.toFixed(6));
            setManualLng(gpsCoords.lng.toFixed(6));
            setPlusCode(code);
            onLocationChange(gpsCoords.lat, gpsCoords.lng, code);
          } else {
            setPosition(gpsCoords);
            setManualLat(gpsCoords.lat.toFixed(6));
            setManualLng(gpsCoords.lng.toFixed(6));
            setPlusCode(code);
            onLocationChange(gpsCoords.lat, gpsCoords.lng, code);
            setGpsUsed(true);
          }

          setLoading(false);
          return;
        } catch (gpsError) {
          console.log('GPS no disponible, usando geocoding...');
        }
      }

      // Geocoding como fallback
      const coords = await geocodeAddress(address, city, state);
      if (coords) {
        const code = generatePlusCode(coords.lat, coords.lng);
        setPosition(coords);
        setManualLat(coords.lat.toFixed(6));
        setManualLng(coords.lng.toFixed(6));
        setPlusCode(code);
        onLocationChange(coords.lat, coords.lng, code);
        setError('📍 Ubicación aproximada. Ajusta el pin en el mapa si es necesario.');
      } else {
        const defaultCoords = GOOGLE_MAPS_CONFIG.defaultCenter;
        const code = generatePlusCode(defaultCoords.lat, defaultCoords.lng);
        setPosition(defaultCoords);
        setManualLat(defaultCoords.lat.toFixed(6));
        setManualLng(defaultCoords.lng.toFixed(6));
        setPlusCode(code);
        setError('⚠️ No se pudo ubicar la dirección. Busca la ubicación en el mapa o ingresa las coordenadas.');
      }

      setLoading(false);
    };

    initializeLocation();
  }, [isLoaded, address, city, state, initialLat, initialLng, initialPlusCode, editable, geocodeAddress, generatePlusCode, decodePlusCode, calculateDistance, onLocationChange]);

  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (!editable || !e.latLng) return;

    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    const newPos = { lat, lng };
    const code = generatePlusCode(lat, lng);
    
    setPosition(newPos);
    setManualLat(lat.toFixed(6));
    setManualLng(lng.toFixed(6));
    setPlusCode(code);
    onLocationChange(lat, lng, code);
    setError(null);
  }, [editable, generatePlusCode, onLocationChange]);

  const handleMarkerDragEnd = useCallback((e: google.maps.MapMouseEvent) => {
    if (!editable || !e.latLng) return;

    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    const newPos = { lat, lng };
    const code = generatePlusCode(lat, lng);
    
    setPosition(newPos);
    setManualLat(lat.toFixed(6));
    setManualLng(lng.toFixed(6));
    setPlusCode(code);
    onLocationChange(lat, lng, code);
  }, [editable, generatePlusCode, onLocationChange]);

  const handleManualUpdate = useCallback(() => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);

    setCoordsSuccess(false);
    setCoordsError(false);

    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      const newPos = { lat, lng };
      const code = generatePlusCode(lat, lng);
      
      setPosition(newPos);
      setPlusCode(code);
      onLocationChange(lat, lng, code);
      setError(null);
      
      setCoordsSuccess(true);
      setTimeout(() => setCoordsSuccess(false), 3000);
    } else {
      setCoordsError(true);
      setTimeout(() => setCoordsError(false), 3000);
    }
  }, [manualLat, manualLng, generatePlusCode, onLocationChange]);

  const handlePlusCodeUpdate = useCallback(() => {
    setPlusCodeSuccess(false);

    const trimmedCode = plusCode.trim();
    
    if (!trimmedCode) {
      setError('⚠️ Plus Code vacío');
      return;
    }

    const coords = decodePlusCode(trimmedCode);
    if (coords) {
      setPosition(coords);
      setManualLat(coords.lat.toFixed(6));
      setManualLng(coords.lng.toFixed(6));
      setPlusCode(trimmedCode);
      onLocationChange(coords.lat, coords.lng, trimmedCode);
      setError(null);
      
      setPlusCodeSuccess(true);
      setTimeout(() => setPlusCodeSuccess(false), 3000);
    } else {
      setError('⚠️ Plus Code inválido. Usa el formato: latitud,longitud');
    }
  }, [plusCode, decodePlusCode, onLocationChange]);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  if (loadError) {
    return (
      <div className="w-full h-64 bg-red-50 rounded-xl flex items-center justify-center">
        <div className="text-center px-4">
          <div className="text-3xl mb-2">⚠️</div>
          <div className="text-sm text-red-600">Error al cargar Google Maps</div>
          <div className="text-xs text-red-500 mt-1">Verifica tu API key</div>
        </div>
      </div>
    );
  }

  if (!isLoaded || loading) {
    return (
      <div className="w-full h-64 bg-gray-100 rounded-xl flex items-center justify-center">
        <div className="text-center">
          <div className="text-3xl mb-2 animate-pulse">🗺️</div>
          <div className="text-sm text-gray-600">Cargando mapa...</div>
        </div>
      </div>
    );
  }

  if (!position) {
    return (
      <div className="w-full h-64 bg-red-50 rounded-xl flex items-center justify-center">
        <div className="text-center px-4">
          <div className="text-3xl mb-2">⚠️</div>
          <div className="text-sm text-red-600">No se pudo cargar la ubicación</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Mensajes globales */}
      {gpsUsed && !error && (
        <div className="px-3 py-2 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
          ✅ Ubicación detectada con GPS
        </div>
      )}
      {error && (
        <div className="px-3 py-2 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-700 text-sm">
          {error}
        </div>
      )}

      {/* Mapa */}
      <div className="w-full h-64 rounded-xl overflow-hidden border-2 border-gray-200">
        <GoogleMap
          mapContainerStyle={MAP_STYLES.containerStyle}
          center={position}
          zoom={GOOGLE_MAPS_CONFIG.defaultZoom}
          options={{
            ...MAP_OPTIONS,
            draggableCursor: editable ? 'crosshair' : 'default'
          }}
          onClick={handleMapClick}
          onLoad={onMapLoad}
        >
          <Marker
            position={position}
            draggable={editable}
            onDragEnd={handleMarkerDragEnd}
          />
        </GoogleMap>
      </div>

      {/* Inputs manuales */}
      {editable && (
        <div className="space-y-3">
          {/* Instrucciones simples */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-3">
            <p className="text-xs text-blue-700 font-semibold">
              💡 <strong>Cómo usar:</strong> Haz clic en el mapa o arrastra el pin rojo a la ubicación exacta de la propiedad
            </p>
          </div>

          {/* Coordenadas Manuales (Alternativa) */}
          <details className="bg-gray-50 border border-gray-300 rounded-xl p-3">
            <summary className="text-xs font-semibold text-gray-700 cursor-pointer">
              ⚙️ Opciones avanzadas (coordenadas manuales)
            </summary>
            <div className="mt-3 space-y-2">
              <p className="text-xs text-gray-600">
                También puedes ingresar las coordenadas manualmente:
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-700">
                    Latitud
                  </label>
                  <input
                    type="text"
                    value={manualLat}
                    onChange={(e) => setManualLat(e.target.value)}
                    placeholder="9.748917"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-700">
                    Longitud
                  </label>
                  <input
                    type="text"
                    value={manualLng}
                    onChange={(e) => setManualLng(e.target.value)}
                    placeholder="-83.753428"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 font-semibold"
                  />
                </div>
              </div>
              <button
                onClick={handleManualUpdate}
                className="w-full py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition-colors text-sm"
              >
                📍 Actualizar desde coordenadas
              </button>
              
              {/* Badges de feedback */}
              {coordsSuccess && (
                <div className="px-3 py-1.5 bg-green-100 border border-green-300 rounded-lg flex items-center gap-2 animate-in fade-in duration-300">
                  <span className="text-green-600 font-bold">✓</span>
                  <span className="text-xs font-semibold text-green-700">
                    Ubicación actualizada exitosamente
                  </span>
                </div>
              )}
              
              {coordsError && (
                <div className="px-3 py-1.5 bg-red-100 border border-red-300 rounded-lg flex items-center gap-2 animate-in fade-in duration-300">
                  <span className="text-red-600 font-bold">✕</span>
                  <span className="text-xs font-semibold text-red-700">
                    Coordenadas inválidas. Verifica los valores ingresados.
                  </span>
                </div>
              )}
            </div>
          </details>

          {/* Coordenadas actuales (solo lectura) */}
          <div className="bg-gray-50 border border-gray-300 rounded-xl p-3">
            <p className="text-xs font-semibold text-gray-700 mb-2">📍 Coordenadas actuales:</p>
            <div className="flex gap-2 text-xs">
              <div className="flex-1">
                <span className="font-semibold text-gray-600">Lat:</span>
                <span className="ml-1 text-gray-900">{manualLat}</span>
              </div>
              <div className="flex-1">
                <span className="font-semibold text-gray-600">Lng:</span>
                <span className="ml-1 text-gray-900">{manualLng}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}