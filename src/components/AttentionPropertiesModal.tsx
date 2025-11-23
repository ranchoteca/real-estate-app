'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface PropertyBasic {
  id: string;
  slug: string;
  title: string;
  photos?: string[] | null;
  photosCount?: number;
  city?: string;
  state?: string;
  updated_at?: string;
}

interface AttentionPropertiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'lessThan5Photos' | 'noMapLocation' | 'notUpdated30Days';
  properties: PropertyBasic[];
}

const MODAL_CONFIG = {
  lessThan5Photos: {
    title: 'Propiedades con pocas fotos',
    emoji: '📸',
    description: 'Estas propiedades tienen menos de 5 fotos. Agregar más fotos mejora la visibilidad.',
    actionText: 'Agregar fotos',
    color: '#F59E0B',
    bgColor: '#FEF3C7',
  },
  noMapLocation: {
    title: 'Sin ubicación en mapa',
    emoji: '📍',
    description: 'Estas propiedades no tienen ubicación configurada en el mapa.',
    actionText: 'Agregar ubicación',
    color: '#2563EB',
    bgColor: '#DBEAFE',
  },
  notUpdated30Days: {
    title: 'Sin actualizar en 30+ días',
    emoji: '⏰',
    description: 'Estas propiedades no se han actualizado en más de 30 días.',
    actionText: 'Actualizar',
    color: '#DC2626',
    bgColor: '#FEE2E2',
  },
};

export default function AttentionPropertiesModal({
  isOpen,
  onClose,
  type,
  properties,
}: AttentionPropertiesModalProps) {
  const router = useRouter();
  const config = MODAL_CONFIG[type];

  if (!isOpen) return null;

  const handleEditProperty = (slug: string) => {
    router.push(`/edit-property/${slug}`);
    onClose();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-CR', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-h-[80vh] flex flex-col rounded-2xl shadow-2xl" style={{ backgroundColor: '#FFFFFF' }}>
        {/* Header */}
        <div className="p-5 border-b" style={{ borderColor: '#E5E7EB' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                style={{ backgroundColor: config.bgColor }}
              >
                {config.emoji}
              </div>
              <div>
                <h2 className="text-lg font-bold" style={{ color: '#0F172A' }}>
                  {config.title}
                </h2>
                <p className="text-sm opacity-70" style={{ color: '#0F172A' }}>
                  {properties.length} {properties.length === 1 ? 'propiedad' : 'propiedades'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: '#F3F4F6' }}
            >
              ✕
            </button>
          </div>
          <p className="text-sm mt-3 opacity-70" style={{ color: '#0F172A' }}>
            {config.description}
          </p>
        </div>

        {/* Lista de propiedades (scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {properties.map((property) => (
            <div
              key={property.id}
              className="flex items-center gap-3 p-3 rounded-xl border"
              style={{ borderColor: '#E5E7EB' }}
            >
              {/* Foto miniatura */}
              <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-200">
                {property.photos && property.photos.length > 0 ? (
                  <Image
                    src={property.photos[0]}
                    alt={property.title}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">
                    🏠
                  </div>
                )}
                
                {/* Badge de fotos si aplica */}
                {type === 'lessThan5Photos' && (
                  <div 
                    className="absolute bottom-0 right-0 px-1.5 py-0.5 text-xs font-bold text-white rounded-tl"
                    style={{ backgroundColor: config.color }}
                  >
                    {property.photosCount || 0}📷
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h3 
                  className="font-semibold text-sm truncate"
                  style={{ color: '#0F172A' }}
                >
                  {property.title}
                </h3>
                
                {type === 'noMapLocation' && (property.city || property.state) && (
                  <p className="text-xs opacity-70 truncate" style={{ color: '#0F172A' }}>
                    📍 {[property.city, property.state].filter(Boolean).join(', ')}
                  </p>
                )}
                
                {type === 'notUpdated30Days' && property.updated_at && (
                  <p className="text-xs opacity-70" style={{ color: '#0F172A' }}>
                    Última actualización: {formatDate(property.updated_at)}
                  </p>
                )}
                
                {type === 'lessThan5Photos' && (
                  <p className="text-xs opacity-70" style={{ color: '#0F172A' }}>
                    {property.photosCount || 0} de 5 fotos mínimas
                  </p>
                )}
              </div>

              {/* Botón editar */}
              <button
                onClick={() => handleEditProperty(property.slug)}
                className="px-3 py-2 rounded-lg text-xs font-bold text-white flex-shrink-0"
                style={{ backgroundColor: config.color }}
              >
                Editar
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t" style={{ borderColor: '#E5E7EB' }}>
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl font-bold"
            style={{ backgroundColor: '#F3F4F6', color: '#0F172A' }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </>
  );
}