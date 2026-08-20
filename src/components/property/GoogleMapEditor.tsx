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
import { useI18nStore } from '@/lib/i18n-store';

interface GoogleMapEditorProps {
  address: string;
  city: string;
  state: string;
  selectedCountry: CountryCode;
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
  selectedCountry,
  initialLat,
  initialLng,
  initialPlusCode,
  onLocationChange,
  editable = true,
}: GoogleMapEditorProps) {
  const { language } = useI18nStore();

  const [position, setPosition] = useState<google.maps.LatLngLiteral | null>(null);
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [plusCode, setPlusCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [coordsSuccess, setCoordsSuccess] = useState(false);
  const [coordsError, setCoordsError] = useState(false);
  const [plusCodeSuccess, setPlusCodeSuccess] = useState(false);
  const [plusCodeError, setPlusCodeError] = useState(false);
  
  const mapRef = useRef<google.maps.Map | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_CONFIG.apiKey,
    libraries: GOOGLE_MAPS_CONFIG.libraries,
  });

  // ── Textos bilingües ──────────────────────────────────────────────────────
  const L = {
    searchingIn:        language === 'en' ? 'Searching in:' : 'Buscando en:',
    plusCodeCountry:    language === 'en' ? 'The Plus Code will be searched in this country' : 'El Plus Code se buscará en este país',
    locationOnMap:      language === 'en' ? 'Locate on map' : 'Ubicar en el mapa',
    searching:          language === 'en' ? 'Searching...' : 'Buscando...',
    searchPlaceholder:  (countryName: string) => language === 'en' ? `Ex: Playa Hermosa, ${countryName}` : `Ej: Playa Hermosa, ${countryName}`,
    plusCodeTitle:      language === 'en' ? 'Google Maps Plus Code' : 'Plus Code de Google Maps',
    plusCodeIntro:      language === 'en' ? 'Did someone send you a WhatsApp location?' : '¿Te enviaron la ubicación por WhatsApp?',
    plusCodeStep1:      language === 'en' ? 'Tap the location to open Google Maps' : 'Toca la ubicación para abrir Google Maps',
    plusCodeStep2:      language === 'en' ? 'Tap the pin or bottom panel' : 'Toca el pin o panel inferior',
    plusCodeStep3:      language === 'en' ? 'Copy the full Plus Code (e.g.:' : 'Copia el Plus Code completo (ej:',
    plusCodeStep4:      language === 'en' ? 'Paste it below 👇 (including the city if shown)' : 'Pégalo aquí abajo 👇 (incluyendo la ciudad si viene)',
    apply:              language === 'en' ? 'Apply' : 'Aplicar',
    plusCodeSuccess:    language === 'en' ? 'Location loaded from Plus Code!' : '¡Ubicación cargada desde Plus Code!',
    plusCodeInvalid:    language === 'en' ? 'Invalid Plus Code. Check you copied it correctly.' : 'Plus Code inválido. Verifica que lo copiaste correctamente.',
    dragTip:            language === 'en' ? 'You can also: Click on the map or drag the red pin to the exact location' : 'También puedes: Hacer clic en el mapa o arrastrar el pin rojo a la ubicación exacta',
    advancedTitle:      language === 'en' ? '⚙️ Advanced options (manual coordinates)' : '⚙️ Opciones avanzadas (coordenadas manuales)',
    advancedDesc:       language === 'en' ? 'If you have exact coordinates (lat/lng), enter them here:' : 'Si tienes las coordenadas exactas (lat/lng), ingrésalas aquí:',
    latitude:           language === 'en' ? 'Latitude' : 'Latitud',
    longitude:          language === 'en' ? 'Longitude' : 'Longitud',
    updateLocation:     language === 'en' ? '📍 Update location' : '📍 Actualizar ubicación',
    coordsSuccess:      language === 'en' ? 'Location and Plus Code updated' : 'Ubicación y Plus Code actualizados',
    coordsInvalid:      language === 'en' ? 'Invalid coordinates' : 'Coordenadas inválidas',
    currentLocation:    language === 'en' ? '📍 Current location:' : '📍 Ubicación actual:',
    loadingMap:         language === 'en' ? 'Loading map...' : 'Cargando mapa...',
    errorLoadingMaps:   language === 'en' ? 'Error loading Google Maps' : 'Error al cargar Google Maps',
    checkApiKey:        language === 'en' ? 'Check your API key' : 'Verifica tu API key',
    couldNotLoad:       language === 'en' ? 'Could not load location' : 'No se pudo cargar la ubicación',
    outsideCountry:     (countryName: string) => language === 'en'
      ? `⚠️ This location appears to be outside ${countryName}. Check the selected country or the Plus Code entered.`
      : `⚠️ Esta ubicación parece estar fuera de ${countryName}. Verifica el país seleccionado o el Plus Code ingresado.`,
    notFoundError:      language === 'en' ? '❌ Location not found. Try with more details or use the Plus Code.' : '❌ No se encontró la ubicación. Intenta con más detalles o usa el Plus Code.',
    searchError:        language === 'en' ? '⚠️ Search error. Check the text entered.' : '⚠️ Error al buscar. Verifica el texto ingresado.',
    approxLocation:     language === 'en' ? '📍 Approximate location based on address. Adjust the pin if needed.' : '📍 Ubicación aproximada basada en la dirección. Ajusta el pin si es necesario.',
    noAddressError:     language === 'en' ? '⚠️ Exact address not found. Please move the pin manually.' : '⚠️ No se encontró la dirección exacta. Por favor, mueve el pin manualmente.',
    emptyPlusCode:      language === 'en' ? '⚠️ Paste the Google Maps Plus Code' : '⚠️ Pega el Plus Code de Google Maps',
    invalidPlusCode:    language === 'en' ? '⚠️ Invalid Plus Code. Check you copied it correctly from Google Maps.' : '⚠️ Plus Code inválido. Verifica que lo hayas copiado correctamente desde Google Maps.',
  };

  // ── Lógica (sin cambios) ──────────────────────────────────────────────────

  const generatePlusCode = useCallback(async (lat: number, lng: number): Promise<string> => {
    try {
      if (!isLoaded) return `${lat.toFixed(6)},${lng.toFixed(6)}`;
      const geocoder = new google.maps.Geocoder();
      const result = await geocoder.geocode({ location: { lat, lng } });
      if (result.results && result.results.length > 0) {
        for (const res of result.results) {
          if (res.plus_code?.global_code) return res.plus_code.global_code;
        }
      }
      return `${lat.toFixed(6)},${lng.toFixed(6)}`;
    } catch (err) {
      console.error('Error generando Plus Code:', err);
      return `${lat.toFixed(6)},${lng.toFixed(6)}`;
    }
  }, [isLoaded]);

  const validateCountry = useCallback((lat: number, lng: number): boolean => {
    const isValid = isLocationInCountry(lat, lng, selectedCountry);
    if (!isValid) {
      const country = getCountryByCode(selectedCountry);
      setWarning(L.outsideCountry(country?.name || ''));
    } else {
      setWarning(null);
    }
    return isValid;
  }, [selectedCountry, language]);

  const decodePlusCode = useCallback(async (code: string): Promise<google.maps.LatLngLiteral | null> => {
    try {
      if (code.includes(',') && !code.includes('+')) {
        const [lat, lng] = code.split(',').map(s => parseFloat(s.trim()));
        if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
      }
      if (!isLoaded) return null;
      const geocoder = new google.maps.Geocoder();
      const cleanCode = code.trim();
      const result = await geocoder.geocode({ address: cleanCode, componentRestrictions: { country: selectedCountry } });
      if (result.results && result.results.length > 0) {
        const location = result.results[0].geometry.location;
        const coords = { lat: location.lat(), lng: location.lng() };
        validateCountry(coords.lat, coords.lng);
        return coords;
      }
      return null;
    } catch (err) {
      console.error('Error decodificando Plus Code:', err);
      return null;
    }
  }, [isLoaded, selectedCountry, validateCountry]);

  const geocodeAddress = useCallback(async (address: string, city: string, state: string): Promise<google.maps.LatLngLiteral | null> => {
    if (!isLoaded) return null;
    try {
      const query = `${address}, ${city}, ${state}`.trim();
      if (!query || query === ', , ') return null;
      const geocoder = new google.maps.Geocoder();
      const result = await geocoder.geocode({ address: query, componentRestrictions: { country: selectedCountry } });
      if (result.results && result.results.length > 0) {
        const location = result.results[0].geometry.location;
        const coords = { lat: location.lat(), lng: location.lng() };
        validateCountry(coords.lat, coords.lng);
        return coords;
      }
      return null;
    } catch (error) {
      console.error('Error en geocoding:', error);
      return null;
    }
  }, [isLoaded, selectedCountry, validateCountry]);

  const calculateDistance = useCallback((coords1: google.maps.LatLngLiteral, coords2: google.maps.LatLngLiteral): number => {
    const R = 6371;
    const dLat = ((coords2.lat - coords1.lat) * Math.PI) / 180;
    const dLon = ((coords2.lng - coords1.lng) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos((coords1.lat * Math.PI) / 180) * Math.cos((coords2.lat * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }, []);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setError(null);
    setWarning(null);
    try {
      const geocoder = new google.maps.Geocoder();
      const result = await geocoder.geocode({ address: searchQuery, componentRestrictions: { country: selectedCountry } });
      if (result.results && result.results.length > 0) {
        const location = result.results[0].geometry.location;
        const coords = { lat: location.lat(), lng: location.lng() };
        const code = await generatePlusCode(coords.lat, coords.lng);
        setPosition(coords);
        setManualLat(coords.lat.toFixed(6));
        setManualLng(coords.lng.toFixed(6));
        setPlusCode(code);
        onLocationChange(coords.lat, coords.lng, code);
        validateCountry(coords.lat, coords.lng);
        if (mapRef.current) { mapRef.current.panTo(coords); mapRef.current.setZoom(16); }
      } else {
        setError(L.notFoundError);
      }
    } catch (err) {
      console.error('Error en búsqueda:', err);
      setError(L.searchError);
    } finally {
      setSearching(false);
    }
  }, [searchQuery, selectedCountry, generatePlusCode, onLocationChange, validateCountry, language]);

  useEffect(() => {
    if (!mapRef.current || !isLoaded) return;
    const country = getCountryByCode(selectedCountry);
    if (country && !position) mapRef.current.panTo(country.center);
  }, [selectedCountry, isLoaded, position]);

  useEffect(() => {
    if (!isLoaded) return;
    const initializeLocation = async () => {
      setLoading(true);
      setError(null);
      setWarning(null);
      if (initialLat && initialLng) {
        const coords: google.maps.LatLngLiteral = { lat: initialLat, lng: initialLng };
        const code = initialPlusCode || await generatePlusCode(initialLat, initialLng);
        setPosition(coords);
        setManualLat(initialLat.toFixed(6));
        setManualLng(initialLng.toFixed(6));
        setPlusCode(code);
        validateCountry(initialLat, initialLng);
        setLoading(false);
        return;
      }
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
      const coords = await geocodeAddress(address, city, state);
      if (coords) {
        const code = await generatePlusCode(coords.lat, coords.lng);
        setPosition(coords);
        setManualLat(coords.lat.toFixed(6));
        setManualLng(coords.lng.toFixed(6));
        setPlusCode(code);
        onLocationChange(coords.lat, coords.lng, code);
        setError(L.approxLocation);
        setLoading(false);
        return;
      }
      const country = getCountryByCode(selectedCountry);
      const defaultCoords = country?.center || GOOGLE_MAPS_CONFIG.defaultCenter;
      const code = await generatePlusCode(defaultCoords.lat, defaultCoords.lng);
      setPosition(defaultCoords);
      setManualLat(defaultCoords.lat.toFixed(6));
      setManualLng(defaultCoords.lng.toFixed(6));
      setPlusCode(code);
      setError(L.noAddressError);
      setLoading(false);
    };
    initializeLocation();
  }, [isLoaded, address, city, state, selectedCountry, initialLat, initialLng, initialPlusCode, editable, geocodeAddress, generatePlusCode, decodePlusCode, calculateDistance, onLocationChange, validateCountry]);

  const handleMapClick = useCallback(async (e: google.maps.MapMouseEvent) => {
    if (!editable || !e.latLng) return;
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    const code = await generatePlusCode(lat, lng);
    setPosition({ lat, lng });
    setManualLat(lat.toFixed(6));
    setManualLng(lng.toFixed(6));
    setPlusCode(code);
    onLocationChange(lat, lng, code);
    setError(null);
    validateCountry(lat, lng);
  }, [editable, generatePlusCode, onLocationChange, validateCountry]);

  const handleMarkerDragEnd = useCallback(async (e: google.maps.MapMouseEvent) => {
    if (!editable || !e.latLng) return;
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    const code = await generatePlusCode(lat, lng);
    setPosition({ lat, lng });
    setManualLat(lat.toFixed(6));
    setManualLng(lng.toFixed(6));
    setPlusCode(code);
    onLocationChange(lat, lng, code);
    validateCountry(lat, lng);
  }, [editable, generatePlusCode, onLocationChange, validateCountry]);

  const handleManualUpdate = useCallback(async () => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    setCoordsSuccess(false);
    setCoordsError(false);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      const code = await generatePlusCode(lat, lng);
      setPosition({ lat, lng });
      setPlusCode(code);
      onLocationChange(lat, lng, code);
      setError(null);
      validateCountry(lat, lng);
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
      setError(L.emptyPlusCode);
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
      setError(L.invalidPlusCode);
      setTimeout(() => setPlusCodeError(false), 3000);
    }
  }, [plusCode, decodePlusCode, generatePlusCode, onLocationChange, language]);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const currentCountry = getCountryByCode(selectedCountry);

  if (loadError) {
    return (
      <div className="w-full h-64 bg-red-50 rounded-xl flex items-center justify-center">
        <div className="text-center px-4">
          <div className="text-3xl mb-2">⚠️</div>
          <div className="text-sm text-red-600">{L.errorLoadingMaps}</div>
          <div className="text-xs text-red-500 mt-1">{L.checkApiKey}</div>
        </div>
      </div>
    );
  }

  if (!isLoaded || loading) {
    return (
      <div className="w-full h-64 bg-gray-100 rounded-xl flex items-center justify-center">
        <div className="text-center">
          <div className="text-3xl mb-2 animate-pulse">🗺️</div>
          <div className="text-sm text-gray-600">{L.loadingMap}</div>
        </div>
      </div>
    );
  }

  if (!position) {
    return (
      <div className="w-full h-64 bg-red-50 rounded-xl flex items-center justify-center">
        <div className="text-center px-4">
          <div className="text-3xl mb-2">⚠️</div>
          <div className="text-sm text-red-600">{L.couldNotLoad}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">

      {/* Indicador de país seleccionado */}
      {currentCountry && editable && (
        <div className="px-3 py-2 rounded-lg bg-blue-50 border border-blue-200 flex items-center gap-2">
          {/* Bandera SVG del país */}
          <CountryFlagSVG code={selectedCountry} size={24} />
          <div>
            <div className="text-sm font-bold text-blue-900">
              {L.searchingIn} {currentCountry.name}
            </div>
            <div className="text-xs text-blue-700">
              {L.plusCodeCountry}
            </div>
          </div>
        </div>
      )}

      {/* Advertencia de país */}
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

      {/* Buscador */}
      {editable && (
        <div className="flex flex-col gap-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder={L.searchPlaceholder(currentCountry?.name || '')}
            className="w-full px-4 py-3 border-2 border-purple-300 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
          />
          <button
            onClick={handleSearch}
            disabled={searching || !searchQuery.trim()}
            className="w-full py-3 bg-purple-500 text-white font-bold rounded-lg hover:bg-purple-600 transition-all active:scale-95 text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
          >
            {searching ? (
              <><span>⏳</span> {L.searching}</>
            ) : (
              <><span>📍</span> {L.locationOnMap}</>
            )}
          </button>
        </div>
      )}

      {/* Mapa */}
      <div className="w-full h-64 rounded-xl overflow-hidden border-2 border-gray-200">
        <GoogleMap
          mapContainerStyle={MAP_STYLES.containerStyle}
          center={position}
          zoom={GOOGLE_MAPS_CONFIG.defaultZoom}
          options={{ ...MAP_OPTIONS, draggableCursor: editable ? 'crosshair' : 'default' }}
          onClick={handleMapClick}
          onLoad={onMapLoad}
        >
          <Marker position={position} draggable={editable} onDragEnd={handleMarkerDragEnd} />
        </GoogleMap>
      </div>

      {/* Inputs manuales */}
      {editable && (
        <div className="space-y-3">

          {/* Plus Code */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
            <label className="block text-sm font-bold mb-2 text-blue-900 flex items-center gap-2">
              <span className="text-lg">📍</span>
              {L.plusCodeTitle}
            </label>
            <p className="text-xs text-blue-700 mb-3 leading-relaxed">
              <strong>{L.plusCodeIntro}</strong><br />
              1️⃣ {L.plusCodeStep1}<br />
              2️⃣ {L.plusCodeStep2}<br />
              3️⃣ {L.plusCodeStep3} <code className="bg-blue-100 px-1 rounded">856V+75F San José</code>)<br />
              4️⃣ {L.plusCodeStep4}
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
                {L.apply}
              </button>
            </div>
            {plusCodeSuccess && (
              <div className="mt-2 px-3 py-1.5 bg-green-100 border border-green-300 rounded-lg flex items-center gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span className="text-xs font-semibold text-green-700">{L.plusCodeSuccess}</span>
              </div>
            )}
            {plusCodeError && (
              <div className="mt-2 px-3 py-1.5 bg-red-100 border border-red-300 rounded-lg flex items-center gap-2">
                <span className="text-red-600 font-bold">✕</span>
                <span className="text-xs font-semibold text-red-700">{L.plusCodeInvalid}</span>
              </div>
            )}
          </div>

          {/* Tip arrastrar */}
          <div className="bg-gray-50 border border-gray-300 rounded-xl p-3">
            <p className="text-xs text-gray-700 font-semibold">
              💡 <strong>{language === 'en' ? 'You can also:' : 'También puedes:'}</strong> {language === 'en' ? 'Click on the map or drag the red pin to the exact location' : 'Hacer clic en el mapa o arrastrar el pin rojo a la ubicación exacta'}
            </p>
          </div>

          {/* Coordenadas manuales */}
          <details className="bg-gray-50 border border-gray-300 rounded-xl p-3">
            <summary className="text-xs font-semibold text-gray-700 cursor-pointer">
              {L.advancedTitle}
            </summary>
            <div className="mt-3 space-y-2">
              <p className="text-xs text-gray-600">{L.advancedDesc}</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-700">{L.latitude}</label>
                  <input
                    type="text"
                    value={manualLat}
                    onChange={(e) => setManualLat(e.target.value)}
                    placeholder="9.748917"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-700">{L.longitude}</label>
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
                {L.updateLocation}
              </button>
              {coordsSuccess && (
                <div className="px-3 py-1.5 bg-green-100 border border-green-300 rounded-lg flex items-center gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span className="text-xs font-semibold text-green-700">{L.coordsSuccess}</span>
                </div>
              )}
              {coordsError && (
                <div className="px-3 py-1.5 bg-red-100 border border-red-300 rounded-lg flex items-center gap-2">
                  <span className="text-red-600 font-bold">✕</span>
                  <span className="text-xs font-semibold text-red-700">{L.coordsInvalid}</span>
                </div>
              )}
            </div>
          </details>

          {/* Ubicación actual */}
          <div className="bg-gray-50 border border-gray-300 rounded-xl p-3">
            <p className="text-xs font-semibold text-gray-700 mb-2">{L.currentLocation}</p>
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

// ── Banderas SVG por país ─────────────────────────────────────────────────────
function CountryFlagSVG({ code, size = 24 }: { code: CountryCode; size?: number }) {
  const h = Math.round(size * 0.7);

  const flags: Record<string, React.ReactNode> = {
    CR: ( // Costa Rica
      <svg width={size} height={h} viewBox="0 0 20 14" style={{ borderRadius: '2px', flexShrink: 0 }}>
        <rect width="20" height="14" fill="#002B7F"/>
        <rect y="2.8" width="20" height="8.4" fill="#FFFFFF"/>
        <rect y="4.2" width="20" height="5.6" fill="#CE1126"/>
      </svg>
    ),
    PA: ( // Panamá
      <svg width={size} height={h} viewBox="0 0 20 14" style={{ borderRadius: '2px', flexShrink: 0 }}>
        <rect width="10" height="7" fill="#FFFFFF"/>
        <rect x="10" width="10" height="7" fill="#D21034"/>
        <rect y="7" width="10" height="7" fill="#003580"/>
        <rect x="10" y="7" width="10" height="7" fill="#FFFFFF"/>
        <polygon points="5,1.5 6.2,5 9.8,5 6.9,7.1 8,10.5 5,8.4 2,10.5 3.1,7.1 0.2,5 3.8,5" fill="#D21034"/>
        <polygon points="15,8.5 16.2,12 19.8,12 16.9,14.1 18,17.5 15,15.4 12,17.5 13.1,14.1 10.2,12 13.8,12" fill="#003580"/>
      </svg>
    ),
    SV: ( // El Salvador
      <svg width={size} height={h} viewBox="0 0 20 14" style={{ borderRadius: '2px', flexShrink: 0 }}>
        <rect width="20" height="14" fill="#0F47AF"/>
        <rect y="4.67" width="20" height="4.67" fill="#FFFFFF"/>
      </svg>
    ),
    EC: ( // Ecuador
      <svg width={size} height={h} viewBox="0 0 20 14" style={{ borderRadius: '2px', flexShrink: 0 }}>
        <rect width="20" height="14" fill="#FFD100"/>
        <rect y="4.67" width="20" height="4.67" fill="#003893"/>
        <rect y="9.33" width="20" height="4.67" fill="#D21034"/>
      </svg>
    ),
    DO: ( // República Dominicana
      <svg width={size} height={h} viewBox="0 0 20 14" style={{ borderRadius: '2px', flexShrink: 0 }}>
        <rect width="10" height="7" fill="#002D62"/>
        <rect x="10" width="10" height="7" fill="#CF142B"/>
        <rect y="7" width="10" height="7" fill="#CF142B"/>
        <rect x="10" y="7" width="10" height="7" fill="#002D62"/>
        <rect x="8.5" y="0" width="3" height="14" fill="#FFFFFF"/>
        <rect y="5.5" width="20" height="3" fill="#FFFFFF"/>
      </svg>
    ),
    ES: ( // España
      <svg width={size} height={h} viewBox="0 0 20 14" style={{ borderRadius: '2px', flexShrink: 0 }}>
        <rect width="20" height="14" fill="#AA151B"/>
        <rect y="3.5" width="20" height="7" fill="#F1BF00"/>
      </svg>
    ),
  };

  return (
    <span style={{ display: 'inline-flex', flexShrink: 0 }}>
      {flags[code] || <span style={{ fontSize: size * 0.8 }}>🌎</span>}
    </span>
  );
}