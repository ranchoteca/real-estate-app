'use client';

import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// 🔧 FIX: Configurar iconos de Leaflet manualmente para Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

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
  onLocationChange: (lat: number, lng: number) => void;
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
  onLocationChange,
  editable = true,
}: MapEditorProps) {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gpsUsed, setGpsUsed] = useState(false);

  // Intentar GPS primero, luego geocoding
  useEffect(() => {
    const initializeLocation = async () => {
      setLoading(true);
      setError(null);

      // 1. Si ya tiene coordenadas iniciales, usarlas
      if (initialLat && initialLng) {
        const coords: [number, number] = [initialLat, initialLng];
        setPosition(coords);
        setManualLat(initialLat.toFixed(6));
        setManualLng(initialLng.toFixed(6));
        setLoading(false);
        return;
      }

      // 2. Intentar GPS del móvil
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

          // Geocodificar la dirección para comparar
          const geocodedCoords = await geocodeAddress(address, city, state);

          if (geocodedCoords) {
            // Calcular distancia
            const distance = calculateDistance(gpsCoords, geocodedCoords);

            // Si están a más de 1km, mostrar alerta
            if (distance > 1) {
              setError(`⚠️ Tu ubicación está a ${distance.toFixed(1)}km de la dirección. Ajusta el pin si es necesario.`);
            } else {
              setGpsUsed(true);
            }

            // Usar GPS de todos modos
            setPosition(gpsCoords);
            setManualLat(gpsCoords[0].toFixed(6));
            setManualLng(gpsCoords[1].toFixed(6));
            onLocationChange(gpsCoords[0], gpsCoords[1]);
          } else {
            // Si geocoding falla, usar GPS
            setPosition(gpsCoords);
            setManualLat(gpsCoords[0].toFixed(6));
            setManualLng(gpsCoords[1].toFixed(6));
            onLocationChange(gpsCoords[0], gpsCoords[1]);
            setGpsUsed(true);
          }

          setLoading(false);
          return;
        } catch (gpsError) {
          console.log('GPS no disponible, usando geocoding...');
        }
      }

      // 3. Fallback: Geocoding de dirección
      const coords = await geocodeAddress(address, city, state);
      if (coords) {
        setPosition(coords);
        setManualLat(coords[0].toFixed(6));
        setManualLng(coords[1].toFixed(6));
        onLocationChange(coords[0], coords[1]);
        setError('📍 Ubicación aproximada. Arrastra el pin para mayor precisión.');
      } else {
        // Default: centro de Costa Rica
        const defaultCoords: [number, number] = [9.7489, -83.7534];
        setPosition(defaultCoords);
        setManualLat(defaultCoords[0].toFixed(6));
        setManualLng(defaultCoords[1].toFixed(6));
        setError('⚠️ No se pudo ubicar la dirección. Coloca el pin manualmente.');
      }

      setLoading(false);
    };

    initializeLocation();
  }, [address, city, state, initialLat, initialLng]);

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
            'User-Agent': 'RealEstateApp/1.0', // Requerido por Nominatim
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
      setPosition(newPos);
      onLocationChange(lat, lng);
      setError(null);
    } else {
      setError('⚠️ Coordenadas inválidas');
    }
  };

  // Actualizar cuando se mueve el pin
  const handlePositionChange = (newPos: [number, number]) => {
    setPosition(newPos);
    setManualLat(newPos[0].toFixed(6));
    setManualLng(newPos[1].toFixed(6));
    onLocationChange(newPos[0], newPos[1]);
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
        <div className="space-y-2">
          <p className="text-xs text-gray-600">
            💡 <strong>Tip:</strong> Arrastra el pin o pega coordenadas desde Google Maps
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
                className="w-full px-3 py-2 border font-bold border-gray-300 rounded-lg text-sm"
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
                className="w-full px-3 py-2 border font-bold border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>
          <button
            onClick={handleManualUpdate}
            className="w-full py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors text-sm"
          >
            📍 Actualizar ubicación
          </button>
        </div>
      )}
    </div>
  );
}