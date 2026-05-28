'use client';

import { useEffect, useRef, useState } from 'react';
import { useI18nStore } from '@/lib/i18n-store';

interface CalculateAltitudeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CalculateAltitudeModal({ isOpen, onClose }: CalculateAltitudeModalProps) {
  const { language } = useI18nStore();
  const mapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [marker, setMarker] = useState<google.maps.Marker | null>(null);
  const [altitude, setAltitude] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !mapRef.current || !window.google) return;

    // Inicializar el mapa centrado en Costa Rica
    const initialLocation = { lat: 9.7489, lng: -83.7534 };
    const newMap = new google.maps.Map(mapRef.current, {
      center: initialLocation,
      zoom: 7,
      mapTypeControl: false,
      streetViewControl: false,
    });

    // Crear el pin (marcador)
    const newMarker = new google.maps.Marker({
      position: initialLocation,
      map: newMap,
      draggable: true,
      animation: google.maps.Animation.DROP,
    });

    setMap(newMap);
    setMarker(newMarker);

    // Inicializar el buscador de lugares restringido a Costa Rica
    if (inputRef.current) {
      const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
        componentRestrictions: { country: 'cr' },
        fields: ['geometry', 'name'],
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (!place.geometry || !place.geometry.location) return;

        newMap.setCenter(place.geometry.location);
        newMap.setZoom(14);
        newMarker.setPosition(place.geometry.location);
        calculateElevation(place.geometry.location);
      });
    }

    // Calcular altura al arrastrar y soltar el pin
    newMarker.addListener('dragend', () => {
      const position = newMarker.getPosition();
      if (position) calculateElevation(position);
    });

    // Calcular altura al hacer clic en cualquier parte del mapa
    newMap.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        newMarker.setPosition(e.latLng);
        calculateElevation(e.latLng);
      }
    });

  }, [isOpen]);

  const calculateElevation = (location: google.maps.LatLng) => {
    setLoading(true);
    const elevator = new google.maps.ElevationService();
    
    elevator.getElevationForLocations({ locations: [location] })
      .then(({ results }) => {
        if (results && results[0]) {
          setAltitude(results[0].elevation); // Elevación en metros
        } else {
          setAltitude(null);
        }
      })
      .catch((e) => {
        console.error('Error calculando elevación:', e);
        setAltitude(null);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col h-[80vh]">
        
        {/* Header del Modal */}
        <div className="px-4 py-4 border-b flex justify-between items-center" style={{ borderColor: '#E5E7EB' }}>
          <h3 className="text-lg font-bold" style={{ color: '#0F172A' }}>
            🏔️ {language === 'en' ? 'Calculate Altitude' : 'Calcular Altura'}
          </h3>
          <button onClick={onClose} className="p-2 bg-gray-100 rounded-full active:scale-90 transition-transform">
            ✕
          </button>
        </div>

        {/* Buscador de ciudades */}
        <div className="p-4" style={{ backgroundColor: '#F9FAFB' }}>
          <input
            ref={inputRef}
            type="text"
            placeholder={language === 'en' ? 'Search city in Costa Rica...' : 'Buscar ciudad en Costa Rica...'}
            className="w-full px-4 py-2.5 rounded-xl border-2 focus:outline-none text-sm"
            style={{ borderColor: '#E5E7EB', backgroundColor: '#FFFFFF', color: '#0F172A' }}
          />
          <p className="text-xs mt-2 opacity-60">
            {language === 'en' ? 'Search a city, move the pin, or tap on the map.' : 'Busca una ciudad, mueve el pin o toca en el mapa.'}
          </p>
        </div>

        {/* Contenedor del Mapa */}
        <div className="flex-1 relative">
          <div ref={mapRef} className="absolute inset-0" />
        </div>

        {/* Resultado de la altura */}
        <div className="p-4 border-t flex flex-col items-center justify-center bg-white">
          <span className="text-sm font-semibold opacity-70 mb-1" style={{ color: '#0F172A' }}>
            {language === 'en' ? 'Altitude at selected point:' : 'Altura en el punto seleccionado:'}
          </span>
          {loading ? (
            <div className="text-xl font-bold animate-pulse text-blue-600">
              {language === 'en' ? 'Calculating...' : 'Calculando...'}
            </div>
          ) : (
            <div className="text-3xl font-bold" style={{ color: '#2563EB' }}>
              {altitude !== null ? `${Math.round(altitude)} m.s.n.m.` : '--'}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}