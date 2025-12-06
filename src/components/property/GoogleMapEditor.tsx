'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import { 
  GOOGLE_MAPS_CONFIG, 
  MAP_STYLES, 
  MAP_OPTIONS,
  CountryCode,
  getCountryByCode,
  isLocationInCountry
} from '@/lib/google-maps-config';

interface GoogleMapEditorProps {
  address: string;
  city: string;
  state: string;
  selectedCountry: CountryCode; // 🆕 País seleccionado del dropdown
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
  selectedCountry, // 🆕
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
  const [warning, setWarning] = useState<string | null>(null); // 🆕 Para advertencias de país
  const [gpsUsed, setGpsUsed] = useState(false);
  const [coordsSuccess, setCoordsSuccess] = useState(false);
  const [coordsError, setCoordsError] = useState(false);
  const [plusCodeSuccess, setPlusCodeSuccess] = useState(false);
  const [plusCodeError, setPlusCodeError] = useState(false);
  
  const mapRef = useRef<google.maps.Map | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_CONFIG.apiKey,
    libraries: GOOGLE_MAPS_CONFIG.libraries,
  });

  // Generar Plus Code REAL usando Google Maps Geocoder
  const generatePlusCode = useCallback(async (lat: number, lng: number): Promise<string> => {
    try {
      if (!isLoaded) {
        return `${lat.toFixed(6)},${lng.toFixed(6)}`;
      }

      const geocoder = new google.maps.Geocoder();
      const result = await geocoder.geocode({ 
        location: { lat, lng } 
      });

      if (result.results && result.results.length > 0) {
        for (const res of result.results) {
          if (res.plus_code?.global_code) {
            return res.plus_code.global_code;
          }
        }
      }

      return `${lat.toFixed(6)},${lng.toFixed(6)}`;
    } catch (err) {
      console.error('Error generando Plus Code:', err);
      return `${lat.toFixed(6)},${lng.toFixed(6)}`;
    }
  }, [isLoaded]);

  // 🆕 Validar si las coordenadas están en el país correcto
  const validateCountry = useCallback((lat: number, lng: number): boolean => {
    const isValid = isLocationInCountry(lat, lng, selectedCountry);
    
    if (!isValid) {
      const country = getCountryByCode(selectedCountry);
      setWarning(
        `⚠️ Esta ubicación parece estar fuera de ${country?.name}. ` +
        `Verifica el país seleccionado o el Plus Code ingresado.`
      );
    } else {
      setWarning(null);
    }
    
    return isValid;
  }, [selectedCountry]);

  // 🆕 Decodificar Plus Code con restricción de país
  const decodePlusCode = useCallback(async (code: string): Promise<google.maps.LatLngLiteral | null> => {
    try {
      // Si es un formato de coordenadas (fallback de versiones anteriores)
      if (code.includes(',') && !code.includes('+')) {
        const [lat, lng] = code.split(',').map(s => parseFloat(s.trim()));
        if (!isNaN(lat) && !isNaN(lng)) {
          return { lat, lng };
        }
      }

      if (!isLoaded) return null;

      const geocoder = new google.maps.Geocoder();
      
      // Limpiar el Plus Code (usar tal cual viene)
      const cleanCode = code.trim();

      // 🆕 Geocodificar con restricción de país
      const result = await geocoder.geocode({ 
        address: cleanCode,
        componentRestrictions: { 
          country: selectedCountry // 🔑 CLAVE: restricción por país
        }
      });

      if (result.results && result.results.length > 0) {
        const location = result.results[0].geometry.location;
        const coords = {
          lat: location.lat(),
          lng: location.lng()
        };
        
        // 🆕 Validar que esté en el país correcto
        validateCountry(coords.lat, coords.lng);
        
        return coords;
      }

      return null;
    } catch (err) {
      console.error('Error decodificando Plus Code:', err);
      return null;
    }
  }, [isLoaded, selectedCountry, validateCountry]);

  // Geocoding usando Google Maps API con restricción de país
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
      const result = await geocoder.geocode({ 
        address: query,
        componentRestrictions: { 
          country: selectedCountry // 🆕 Restricción por país
        }
      });

      if (result.results && result.results.length > 0) {
        const location = result.results[0].geometry.location;
        const coords = {
          lat: location.lat(),
          lng: location.lng()
        };
        
        // 🆕 Validar país
        validateCountry(coords.lat, coords.lng);
        
        return coords;
      }

      return null;
    } catch (error) {
      console.error('Error en geocoding:', error);
      return null;
    }
  }, [isLoaded, selectedCountry, validateCountry]);

  // Calcular distancia entre dos puntos
  const calculateDistance = useCallback((
    coords1: google.maps.LatLngLiteral,
    coords2: google.maps.LatLngLiteral
  ): number => {
    const R = 6371;
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

  // 🆕 Centrar mapa en el país seleccionado cuando cambia
  useEffect(() => {
    if (!mapRef.current || !isLoaded) return;
    
    const country = getCountryByCode(selectedCountry);
    if (country && !position) {
      mapRef.current.panTo(country.center);
    }
  }, [selectedCountry, isLoaded, position]);

  // Inicializar ubicación
  useEffect(() => {
    if (!isLoaded) return;

    const initializeLocation = async () => {
      setLoading(true);
      setError(null);
      setWarning(null);

      // Si hay coordenadas iniciales, usarlas
      if (initialLat && initialLng) {
        const coords: google.maps.LatLngLiteral = { lat: initialLat, lng: initialLng };
        const code = initialPlusCode || await generatePlusCode(initialLat, initialLng);
        
        setPosition(coords);
        setManualLat(initialLat.toFixed(6));
        setManualLng(initialLng.toFixed(6));
        setPlusCode(code);
        validateCountry(initialLat, initialLng); // 🆕 Validar país
        setLoading(false);
        return;
      }

      // Si hay Plus Code inicial, decodificarlo
      if (initialPlusCode) {
        const coords = await decodePlusCode(initialPlusCode);
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

          const code = await generatePlusCode(gpsCoords.lat, gpsCoords.lng);
          const geocodedCoords = await geocodeAddress(address, city, state);

          if (geocodedCoords) {
            const distance = calculateDistance(gpsCoords, geocodedCoords);

            if (distance > 1) {
              setError(`⚠️ Tu ubicación está a ${distance.toFixed(1)}km de la dirección. Ajusta usando el Plus Code o arrastra el pin.`);
            } else {
              setGpsUsed(true);
            }

            setPosition(gpsCoords);
            setManualLat(gpsCoords.lat.toFixed(6));
            setManualLng(gpsCoords.lng.toFixed(6));
            setPlusCode(code);
            onLocationChange(gpsCoords.lat, gpsCoords.lng, code);
            validateCountry(gpsCoords.lat, gpsCoords.lng); // 🆕
          } else {
            setPosition(gpsCoords);
            setManualLat(gpsCoords.lat.toFixed(6));
            setManualLng(gpsCoords.lng.toFixed(6));
            setPlusCode(code);
            onLocationChange(gpsCoords.lat, gpsCoords.lng, code);
            setGpsUsed(true);
            validateCountry(gpsCoords.lat, gpsCoords.lng); // 🆕
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
        const code = await generatePlusCode(coords.lat, coords.lng);
        setPosition(coords);
        setManualLat(coords.lat.toFixed(6));
        setManualLng(coords.lng.toFixed(6));
        setPlusCode(code);
        onLocationChange(coords.lat, coords.lng, code);
        setError('📍 Ubicación aproximada. Ajusta usando el Plus Code o arrastra el pin.');
      } else {
        // 🆕 Usar centro del país seleccionado como default
        const country = getCountryByCode(selectedCountry);
        const defaultCoords = country?.center || GOOGLE_MAPS_CONFIG.defaultCenter;
        const code = await generatePlusCode(defaultCoords.lat, defaultCoords.lng);
        setPosition(defaultCoords);
        setManualLat(defaultCoords.lat.toFixed(6));
        setManualLng(defaultCoords.lng.toFixed(6));
        setPlusCode(code);
        setError('⚠️ No se pudo ubicar la dirección. Pega el Plus Code de Google Maps.');
      }

      setLoading(false);
    };

    initializeLocation();
  }, [isLoaded, address, city, state, selectedCountry, initialLat, initialLng, initialPlusCode, editable, geocodeAddress, generatePlusCode, decodePlusCode, calculateDistance, onLocationChange, validateCountry]);

  const handleMapClick = useCallback(async (e: google.maps.MapMouseEvent) => {
    if (!editable || !e.latLng) return;

    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    const newPos = { lat, lng };
    const code = await generatePlusCode(lat, lng);
    
    setPosition(newPos);
    setManualLat(lat.toFixed(6));
    setManualLng(lng.toFixed(6));
    setPlusCode(code);
    onLocationChange(lat, lng, code);
    setError(null);
    validateCountry(lat, lng); // 🆕
  }, [editable, generatePlusCode, onLocationChange, validateCountry]);

  const handleMarkerDragEnd = useCallback(async (e: google.maps.MapMouseEvent) => {
    if (!editable || !e.latLng) return;

    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    const newPos = { lat, lng };
    const code = await generatePlusCode(lat, lng);
    
    setPosition(newPos);
    setManualLat(lat.toFixed(6));
    setManualLng(lng.toFixed(6));
    setPlusCode(code);
    onLocationChange(lat, lng, code);
    validateCountry(lat, lng); // 🆕
  }, [editable, generatePlusCode, onLocationChange, validateCountry]);

  const handleManualUpdate = useCallback(async () => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);

    setCoordsSuccess(false);
    setCoordsError(false);

    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      const newPos = { lat, lng };
      const code = await generatePlusCode(lat, lng);
      
      setPosition(newPos);
      setPlusCode(code);
      onLocationChange(lat, lng, code);
      setError(null);
      validateCountry(lat, lng); // 🆕
      
      setCoordsSuccess(true);
      setTimeout(() => setCoordsSuccess(false), 3000);
    } else {
      setCoordsError(true);
      setTimeout(() => setCoordsError(false), 3000);
    }
  }, [manualLat, manualLng, generatePlusCode, onLocationChange, validateCountry]);

  const handlePlusCodeUpdate = useCallback(async () => {
    setPlusCodeSuccess(false);
    setPlusCodeError(false);

    const trimmedCode = plusCode.trim();
    
    if (!trimmedCode) {
      setPlusCodeError(true);
      setError('⚠️ Pega el Plus Code de Google Maps');
      setTimeout(() => setPlusCodeError(false), 3000);
      return;
    }

    const coords = await decodePlusCode(trimmedCode);
    
    if (coords) {
      const code = await generatePlusCode(coords.lat, coords.lng);
      
      setPosition(coords);
      setManualLat(coords.lat.toFixed(6));
      setManualLng(coords.lng.toFixed(6));
      setPlusCode(code);
      onLocationChange(coords.lat, coords.lng, code);
      setError(null);
      
      setPlusCodeSuccess(true);
      setTimeout(() => setPlusCodeSuccess(false), 3000);
    } else {
      setPlusCodeError(true);
      setError('⚠️ Plus Code inválido. Verifica que lo hayas copiado correctamente desde Google Maps.');
      setTimeout(() => setPlusCodeError(false), 3000);
    }
  }, [plusCode, decodePlusCode, generatePlusCode, onLocationChange]);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  // 🆕 Obtener país actual para mostrar en UI
  const currentCountry = getCountryByCode(selectedCountry);

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
      {/* 🆕 Indicador de país seleccionado */}
      {currentCountry && editable && (
        <div className="px-3 py-2 rounded-lg bg-blue-50 border border-blue-200 flex items-center gap-2">
          <span className="text-2xl">{currentCountry.flag}</span>
          <div>
            <div className="text-sm font-bold text-blue-900">
              Buscando en: {currentCountry.name}
            </div>
            <div className="text-xs text-blue-700">
              El Plus Code se buscará en este país
            </div>
          </div>
        </div>
      )}

      {/* Mensajes globales */}
      {gpsUsed && !error && !warning && (
        <div className="px-3 py-2 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
          ✅ Ubicación detectada con GPS
        </div>
      )}
      
      {/* 🆕 Advertencia de país */}
      {warning && (
        <div className="px-3 py-2 rounded-lg bg-orange-50 border border-orange-300 text-orange-800 text-sm">
          {warning}
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
          {/* Plus Code Input (PRINCIPAL) */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
            <label className="block text-sm font-bold mb-2 text-blue-900 flex items-center gap-2">
              <span className="text-lg">📍</span>
              Plus Code de Google Maps
            </label>
            <p className="text-xs text-blue-700 mb-3 leading-relaxed">
              <strong>¿Te enviaron la ubicación por WhatsApp?</strong><br />
              1️⃣ Toca la ubicación para abrir Google Maps<br />
              2️⃣ Toca el pin o panel inferior<br />
              3️⃣ Copia el Plus Code completo (ej: <code className="bg-blue-100 px-1 rounded">856V+75F San José</code>)<br />
              4️⃣ Pégalo aquí abajo 👇 (incluyendo la ciudad si viene)
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={plusCode}
                onChange={(e) => setPlusCode(e.target.value)}
                placeholder={`Ej: 856V+75F ${currentCountry?.name || ''}`}
                className="flex-1 px-3 py-2 border-2 border-blue-300 rounded-lg text-sm text-gray-900 font-mono bg-white"
              />
              <button
                onClick={handlePlusCodeUpdate}
                className="px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors text-sm whitespace-nowrap"
              >
                Aplicar
              </button>
            </div>
            
            {/* Badge de éxito para Plus Code */}
            {plusCodeSuccess && (
              <div className="mt-2 px-3 py-1.5 bg-green-100 border border-green-300 rounded-lg flex items-center gap-2 animate-in fade-in duration-300">
                <span className="text-green-600 font-bold">✓</span>
                <span className="text-xs font-semibold text-green-700">
                  ¡Ubicación cargada desde Plus Code!
                </span>
              </div>
            )}

            {/* Badge de error para Plus Code */}
            {plusCodeError && (
              <div className="mt-2 px-3 py-1.5 bg-red-100 border border-red-300 rounded-lg flex items-center gap-2 animate-in fade-in duration-300">
                <span className="text-red-600 font-bold">✕</span>
                <span className="text-xs font-semibold text-red-700">
                  Plus Code inválido. Verifica que lo copiaste correctamente.
                </span>
              </div>
            )}
          </div>

          {/* Instrucción para arrastrar */}
          <div className="bg-gray-50 border border-gray-300 rounded-xl p-3">
            <p className="text-xs text-gray-700 font-semibold">
              💡 <strong>También puedes:</strong> Hacer clic en el mapa o arrastrar el pin rojo a la ubicación exacta
            </p>
          </div>

          {/* Coordenadas Manuales (Alternativa) */}
          <details className="bg-gray-50 border border-gray-300 rounded-xl p-3">
            <summary className="text-xs font-semibold text-gray-700 cursor-pointer">
              ⚙️ Opciones avanzadas (coordenadas manuales)
            </summary>
            <div className="mt-3 space-y-2">
              <p className="text-xs text-gray-600">
                Si tienes las coordenadas exactas (lat/lng), ingrésalas aquí:
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
                📍 Actualizar ubicación
              </button>
              
              {/* Badges de feedback para coordenadas */}
              {coordsSuccess && (
                <div className="px-3 py-1.5 bg-green-100 border border-green-300 rounded-lg flex items-center gap-2 animate-in fade-in duration-300">
                  <span className="text-green-600 font-bold">✓</span>
                  <span className="text-xs font-semibold text-green-700">
                    Ubicación y Plus Code actualizados
                  </span>
                </div>
              )}
              
              {coordsError && (
                <div className="px-3 py-1.5 bg-red-100 border border-red-300 rounded-lg flex items-center gap-2 animate-in fade-in duration-300">
                  <span className="text-red-600 font-bold">✕</span>
                  <span className="text-xs font-semibold text-red-700">
                    Coordenadas inválidas
                  </span>
                </div>
              )}
            </div>
          </details>

          {/* Coordenadas actuales (solo lectura) */}
          <div className="bg-gray-50 border border-gray-300 rounded-xl p-3">
            <p className="text-xs font-semibold text-gray-700 mb-2">📍 Ubicación actual:</p>
            <div className="space-y-1">
              <div className="flex gap-2 text-xs">
                <div className="flex-1">
                  <span className="font-semibold text-gray-600">Lat:</span>
                  <span className="ml-1 text-gray-900 font-mono">{manualLat}</span>
                </div>
                <div className="flex-1">
                  <span className="font-semibold text-gray-600">Lng:</span>
                  <span className="ml-1 text-gray-900 font-mono">{manualLng}</span>
                </div>
              </div>
              <div className="text-xs">
                <span className="font-semibold text-gray-600">Plus Code:</span>
                <span className="ml-1 text-blue-700 font-mono font-bold">{plusCode}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}