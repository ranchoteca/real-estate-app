'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { encode, decode, recoverNearest } from 'open-location-code';
import 'leaflet/dist/leaflet.css';

// Importar Leaflet dinámicamente (solo client-side)
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const useMapEvents = dynamic(
  () => import('react-leaflet').then((mod) => mod.useMapEvents),
  { ssr: false }
);

interface MapEditorProps {
  address: string;
  city: string;
  state: string;
  initialLat?: number | null;
  initialLng?: number | null;
  initialPlusCode?: string | null;
  onLocationChange: (lat: number, lng: number, plusCode: string) => void;
  editable?: boolean;
}

// Componente para manejar clics en el mapa
function LocationMarker({ 
  position, 
  setPosition,
  editable 
}: { 
  position: [number, number]; 
  setPosition: (pos: [number, number]) => void;
  editable: boolean;
}) {
  const map = useMapEvents({
    click(e) {
      if (editable) {
        setPosition([e.latlng.lat, e.latlng.lng]);
      }
    },
  });

  return position ? (
    <Marker 
      position={position} 
      draggable={editable}
      eventHandlers={{
        dragend: (e) => {
          if (editable) {
            const marker = e.target;
            const pos = marker.getLatLng();
            setPosition([pos.lat, pos.lng]);
          }
        },
      }}
    />
  ) : null;
}

export default function MapEditor({
  address,
  city,
  state,
  initialLat,
  initialLng,
  initialPlusCode,
  onLocationChange,
  editable = true,
}: MapEditorProps) {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [plusCode, setPlusCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gpsUsed, setGpsUsed] = useState(false);
  const [leafletReady, setLeafletReady] = useState(false);

  // 🔧 Configurar iconos de Leaflet una sola vez
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('leaflet').then((L) => {
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        });
        setLeafletReady(true);
      });
    }
  }, []);

  // Generar Plus Code desde coordenadas
  const generatePlusCode = (lat: number, lng: number): string => {
    try {
      return encode(lat, lng, 11); // 11 dígitos = precisión de ~3.5m
    } catch (err) {
      console.error('Error generando Plus Code:', err);
      return '';
    }
  };

  // Decodificar Plus Code a coordenadas
  const decodePlusCode = (code: string): [number, number] | null => {
    try {
      const decoded = decode(code);
      const lat = decoded.latitudeCenter;
      const lng = decoded.longitudeCenter;
      return [lat, lng];
    } catch (err) {
      console.error('Error decodificando Plus Code:', err);
      return null;
    }
  };

  // Intentar GPS primero, luego geocoding
  useEffect(() => {
    const initializeLocation = async () => {
      setLoading(true);
      setError(null);

      // 1. Si ya tiene coordenadas iniciales, usarlas
      if (initialLat && initialLng) {
        const coords: [number, number] = [initialLat, initialLng];
        const code = initialPlusCode || generatePlusCode(initialLat, initialLng);
        
        setPosition(coords);
        setManualLat(initialLat.toFixed(6));
        setManualLng(initialLng.toFixed(6));
        setPlusCode(code);
        setLoading(false);
        return;
      }

      // 2. Si tiene Plus Code inicial, decodificarlo
      if (initialPlusCode) {
        const coords = decodePlusCode(initialPlusCode);
        if (coords) {
          setPosition(coords);
          setManualLat(coords[0].toFixed(6));
          setManualLng(coords[1].toFixed(6));
          setPlusCode(initialPlusCode);
          onLocationChange(coords[0], coords[1], initialPlusCode);
          setLoading(false);
          return;
        }
      }

      // 3. Intentar GPS del móvil
      if (navigator.geolocation && editable) {
        try {
          const gpsPosition = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 5000,
              maximumAge: 0,
            });
          });

          const gpsCoords: [number, number] = [
            gpsPosition.coords.latitude,
            gpsPosition.coords.longitude,
          ];

          const code = generatePlusCode(gpsCoords[0], gpsCoords[1]);

          // Geocodificar la dirección para comparar
          const geocodedCoords = await geocodeAddress(address, city, state);

          if (geocodedCoords) {
            // Calcular distancia
            const distance = calculateDistance(gpsCoords, geocodedCoords);

            // Si están a más de 1km, mostrar alerta
            if (distance > 1) {
              setError(`⚠️ Tu ubicación está a ${distance.toFixed(1)}km de la dirección. Ajusta el pin o pega el Plus Code correcto.`);
            } else {
              setGpsUsed(true);
            }

            // Usar GPS de todos modos
            setPosition(gpsCoords);
            setManualLat(gpsCoords[0].toFixed(6));
            setManualLng(gpsCoords[1].toFixed(6));
            setPlusCode(code);
            onLocationChange(gpsCoords[0], gpsCoords[1], code);
          } else {
            // Si geocoding falla, usar GPS
            setPosition(gpsCoords);
            setManualLat(gpsCoords[0].toFixed(6));
            setManualLng(gpsCoords[1].toFixed(6));
            setPlusCode(code);
            onLocationChange(gpsCoords[0], gpsCoords[1], code);
            setGpsUsed(true);
          }

          setLoading(false);
          return;
        } catch (gpsError) {
          console.log('GPS no disponible, usando geocoding...');
        }
      }

      // 4. Fallback: Geocoding de dirección
      const coords = await geocodeAddress(address, city, state);
      if (coords) {
        const code = generatePlusCode(coords[0], coords[1]);
        setPosition(coords);
        setManualLat(coords[0].toFixed(6));
        setManualLng(coords[1].toFixed(6));
        setPlusCode(code);
        onLocationChange(coords[0], coords[1], code);
        setError('📍 Ubicación aproximada. Arrastra el pin o pega el Plus Code exacto.');
      } else {
        // Default: centro de Costa Rica
        const defaultCoords: [number, number] = [9.7489, -83.7534];
        const code = generatePlusCode(defaultCoords[0], defaultCoords[1]);
        setPosition(defaultCoords);
        setManualLat(defaultCoords[0].toFixed(6));
        setManualLng(defaultCoords[1].toFixed(6));
        setPlusCode(code);
        setError('⚠️ No se pudo ubicar la dirección. Pega el Plus Code de Google Maps.');
      }

      setLoading(false);
    };

    initializeLocation();
  }, [address, city, state, initialLat, initialLng, initialPlusCode]);

  // Geocoding con Nominatim (OpenStreetMap)
  const geocodeAddress = async (
    address: string, 
    city: string, 
    state: string
  ): Promise<[number, number] | null> => {
    try {
      const query = `${address}, ${city}, ${state}`.trim();
      if (!query || query === ', , ') return null;

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
        {
          headers: {
            'User-Agent': 'RealEstateApp/1.0',
          },
        }
      );

      const data = await response.json();
      
      if (data && data.length > 0) {
        return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      }

      return null;
    } catch (error) {
      console.error('Error en geocoding:', error);
      return null;
    }
  };

  // Calcular distancia entre dos puntos (Haversine)
  const calculateDistance = (
    coords1: [number, number],
    coords2: [number, number]
  ): number => {
    const R = 6371; // Radio de la Tierra en km
    const dLat = ((coords2[0] - coords1[0]) * Math.PI) / 180;
    const dLon = ((coords2[1] - coords1[1]) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((coords1[0] * Math.PI) / 180) *
        Math.cos((coords2[0] * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Actualizar posición desde inputs manuales
  const handleManualUpdate = () => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);

    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      const newPos: [number, number] = [lat, lng];
      const code = generatePlusCode(lat, lng);
      
      setPosition(newPos);
      setPlusCode(code);
      onLocationChange(lat, lng, code);
      setError(null);
    } else {
      setError('⚠️ Coordenadas inválidas');
    }
  };

  const handlePlusCodeUpdate = () => {
    const trimmedCode = plusCode.trim().toUpperCase();
    if (!trimmedCode) {
      setError('⚠️ Plus Code vacío');
      return;
    }

    try {
      // 🔍 Detectar si el Plus Code es corto (por ejemplo: 856V+75F)
      const isShort = !trimmedCode.includes(' ') && trimmedCode.split('+')[0].length < 8;
      let fullCode = trimmedCode;

      // 📍 Si es corto, intentar expandirlo usando una posición de referencia
      if (isShort) {
        const reference = position || [9.7489, -83.7534]; // coordenadas por defecto en Costa Rica
        fullCode = recoverNearest(trimmedCode, reference[0], reference[1]);
      }

      // Aplicar el código completo
      const decoded = decode(fullCode);
      if (decoded && decoded.latitudeCenter && decoded.longitudeCenter) {
        const coords: [number, number] = [decoded.latitudeCenter, decoded.longitudeCenter];
        setPosition(coords);
        setManualLat(coords[0].toFixed(6));
        setManualLng(coords[1].toFixed(6));
        setPlusCode(fullCode);
        onLocationChange(coords[0], coords[1], fullCode);
        setError(null);
      } else {
        setError('⚠️ No se pudo convertir el Plus Code.');
      }
    } catch (err) {
      console.error("Error decodificando Plus Code:", err);
      setError('⚠️ Plus Code inválido o no reconocido');
    }
  };

  // Actualizar cuando se mueve el pin
  const handlePositionChange = (newPos: [number, number]) => {
    const code = generatePlusCode(newPos[0], newPos[1]);
    
    setPosition(newPos);
    setManualLat(newPos[0].toFixed(6));
    setManualLng(newPos[1].toFixed(6));
    setPlusCode(code);
    onLocationChange(newPos[0], newPos[1], code);
  };

  if (loading) {
    return (
      <div className="w-full h-64 bg-gray-100 rounded-xl flex items-center justify-center">
        <div className="text-center">
          <div className="text-3xl mb-2 animate-pulse">🗺️</div>
          <div className="text-sm text-gray-600">Cargando mapa...</div>
        </div>
      </div>
    );
  }

  if (!position || !leafletReady) {
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
      {/* Mensajes */}
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
        <MapContainer
          center={position}
          zoom={15}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker 
            position={position} 
            setPosition={handlePositionChange}
            editable={editable}
          />
        </MapContainer>
      </div>

      {/* Inputs manuales */}
      {editable && (
        <div className="space-y-3">
          {/* Plus Code Input (PRINCIPAL) */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-3">
            <label className="block text-sm font-bold mb-2 text-blue-900 flex items-center gap-2">
              <span className="text-lg">📍</span>
              Plus Code (Google Maps)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={plusCode}
                onChange={(e) => setPlusCode(e.target.value.toUpperCase())}
                placeholder="87G5MX9C+XX"
                className="flex-1 px-3 py-2 border-2 border-blue-300 rounded-lg text-sm text-gray-900 font-mono font-bold bg-white"
              />
              <button
                onClick={handlePlusCodeUpdate}
                className="px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors text-sm whitespace-nowrap"
              >
                Aplicar
              </button>
            </div>
            <p className="text-xs text-blue-700 mt-2">
              💡 <strong>Copia el Plus Code desde Google Maps</strong> (búscalo haciendo clic derecho en el mapa)
            </p>
          </div>

          {/* Coordenadas Manuales (Alternativa) */}
          <details className="bg-gray-50 border border-gray-300 rounded-xl p-3">
            <summary className="text-xs font-semibold text-gray-700 cursor-pointer">
              ⚙️ Opciones avanzadas (coordenadas manuales)
            </summary>
            <div className="mt-3 space-y-2">
              <p className="text-xs text-gray-600">
                También puedes arrastrar el pin en el mapa o ingresar coordenadas:
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
            </div>
          </details>
        </div>
      )}
    </div>
  );
}