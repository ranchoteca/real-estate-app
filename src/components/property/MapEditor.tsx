'use client';

import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
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
  const [olcReady, setOlcReady] = useState(false);
  const [plusCodeSuccess, setPlusCodeSuccess] = useState(false);
  const [coordsSuccess, setCoordsSuccess] = useState(false);
  const [coordsError, setCoordsError] = useState(false);
  
  // Referencia al mapa para poder actualizarlo
  const mapRef = useRef<any>(null);
  
  // Guardar referencia a la instancia de OpenLocationCode
  const olcInstance = useRef<any>(null);

  // 🔧 Cargar open-location-code dinámicamente
  useEffect(() => {
    if (typeof window !== 'undefined' && !olcInstance.current) {
      import('open-location-code').then((module) => {
        const OpenLocationCodeClass = module.default?.OpenLocationCode || module.OpenLocationCode;
        olcInstance.current = new OpenLocationCodeClass();
        console.log('✅ OpenLocationCode instanciado');
        setOlcReady(true);
      }).catch(err => {
        console.error('❌ Error cargando open-location-code:', err);
        setOlcReady(true);
      });
    }
  }, []);

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
      if (olcInstance.current?.encode) {
        return olcInstance.current.encode(lat, lng, 11);
      }
      console.warn('⚠️ OpenLocationCode.encode no disponible');
      return `${lat.toFixed(6)},${lng.toFixed(6)}`;
    } catch (err) {
      console.error('Error generando Plus Code:', err);
      return `${lat.toFixed(6)},${lng.toFixed(6)}`;
    }
  };

  // Decodificar Plus Code a coordenadas
  const decodePlusCode = (code: string): [number, number] | null => {
    try {
      if (code.includes(',') && !code.includes('+')) {
        const [lat, lng] = code.split(',').map(s => parseFloat(s.trim()));
        if (!isNaN(lat) && !isNaN(lng)) {
          return [lat, lng];
        }
      }
      
      if (olcInstance.current?.decode) {
        const decoded = olcInstance.current.decode(code);
        return [decoded.latitudeCenter, decoded.longitudeCenter];
      }
      
      console.warn('⚠️ OpenLocationCode.decode no disponible');
      return null;
    } catch (err) {
      console.error('Error decodificando Plus Code:', err);
      return null;
    }
  };

  // Componente interno que usa el hook useMap para actualizar la vista
  const MapUpdater = dynamic(
    () => import('react-leaflet').then((mod) => {
      const { useMap } = mod;
      return () => {
        const map = useMap();
        mapRef.current = map;
        
        // Actualizar vista cuando cambia la posición
        useEffect(() => {
          if (position && map) {
            map.setView(position, 15, { animate: true });
          }
        }, [position, map]);
        
        return null;
      };
    }),
    { ssr: false }
  );

  // Intentar GPS primero, luego geocoding
  useEffect(() => {
    if (!olcReady) return;

    const initializeLocation = async () => {
      setLoading(true);
      setError(null);

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
          const geocodedCoords = await geocodeAddress(address, city, state);

          if (geocodedCoords) {
            const distance = calculateDistance(gpsCoords, geocodedCoords);

            if (distance > 1) {
              setError(`⚠️ Tu ubicación está a ${distance.toFixed(1)}km de la dirección. Ajusta el pin o pega el Plus Code correcto.`);
            } else {
              setGpsUsed(true);
            }

            setPosition(gpsCoords);
            setManualLat(gpsCoords[0].toFixed(6));
            setManualLng(gpsCoords[1].toFixed(6));
            setPlusCode(code);
            onLocationChange(gpsCoords[0], gpsCoords[1], code);
          } else {
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
  }, [olcReady, address, city, state, initialLat, initialLng, initialPlusCode]);

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

  const calculateDistance = (
    coords1: [number, number],
    coords2: [number, number]
  ): number => {
    const R = 6371;
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

  const handleManualUpdate = () => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);

    // Limpiar estados de feedback
    setCoordsSuccess(false);
    setCoordsError(false);

    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      const newPos: [number, number] = [lat, lng];
      const code = generatePlusCode(lat, lng);
      
      setPosition(newPos);
      setPlusCode(code);
      onLocationChange(lat, lng, code);
      setError(null);
      
      // Mostrar feedback de éxito
      setCoordsSuccess(true);
      setTimeout(() => setCoordsSuccess(false), 3000);
    } else {
      setCoordsError(true);
      setTimeout(() => setCoordsError(false), 3000);
    }
  };

  const handlePlusCodeUpdate = () => {
    if (!olcInstance.current) {
      setError('⚠️ Librería de Plus Code no está cargada');
      return;
    }

    // Limpiar estado de éxito anterior
    setPlusCodeSuccess(false);

    let trimmedCode = plusCode.trim().toUpperCase();
    
    const codeMatch = trimmedCode.match(/[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,}/);
    if (codeMatch) {
      trimmedCode = codeMatch[0];
    }
    
    if (!trimmedCode) {
      setError('⚠️ Plus Code vacío');
      return;
    }

    try {
      const parts = trimmedCode.split('+');
      const isShort = parts[0].length < 8;
      let fullCode = trimmedCode;

      if (isShort && olcInstance.current.recoverNearest) {
        const reference = position || [10.3, -84.8];
        fullCode = olcInstance.current.recoverNearest(
          trimmedCode, 
          reference[0], 
          reference[1]
        );
        console.log(`🔄 Plus Code expandido: ${trimmedCode} → ${fullCode}`);
      }

      const decoded = olcInstance.current.decode(fullCode);
      if (decoded && decoded.latitudeCenter && decoded.longitudeCenter) {
        const coords: [number, number] = [decoded.latitudeCenter, decoded.longitudeCenter];
        setPosition(coords);
        setManualLat(coords[0].toFixed(6));
        setManualLng(coords[1].toFixed(6));
        setPlusCode(fullCode);
        onLocationChange(coords[0], coords[1], fullCode);
        setError(null);
        
        // Mostrar badge de éxito
        setPlusCodeSuccess(true);
        setTimeout(() => setPlusCodeSuccess(false), 3000);
      } else {
        setError('⚠️ No se pudo convertir el Plus Code.');
      }
    } catch (err) {
      console.error("Error decodificando Plus Code:", err);
      setError('⚠️ Plus Code inválido. Intenta con el código completo desde Google Maps.');
    }
  };

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
          <MapUpdater />
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
                placeholder="856V+75F o 856V+75F Ciudad"
                className="flex-1 px-3 py-2 border-2 border-blue-300 rounded-lg text-sm text-gray-900 font-mono font-bold bg-white"
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
                  Plus Code aplicado exitosamente
                </span>
              </div>
            )}
            
            <p className="text-xs text-blue-700 mt-2">
              💡 <strong>Pega el Plus Code desde Google Maps</strong> (puede incluir el nombre de la ciudad)
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
              
              {/* Badges de feedback para coordenadas */}
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
        </div>
      )}
    </div>
  );
}