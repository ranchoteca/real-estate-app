'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import MobileLayout from '@/components/MobileLayout';

interface Property {
  id: string;
  title: string;
  description: string;
  price: number | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  sqft: number | null;
  property_type: string | null;
  photos: string[] | null;
  status: string;
  views: number;
  created_at: string;
  agent: {
    name: string | null;
    full_name: string | null;
    phone: string | null;
    email: string;
    brokerage: string | null;
    profile_photo: string | null;
  };
}

export default function PropertyPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [showShareMenu, setShowShareMenu] = useState(false);

  useEffect(() => {
    if (slug) {
      loadProperty();
    }
  }, [slug]);

  const loadProperty = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/property/${slug}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Propiedad no encontrada');
        } else {
          setError('Error al cargar la propiedad');
        }
        return;
      }
      
      const data = await response.json();
      setProperty(data.property);
    } catch (err) {
      console.error('Error loading property:', err);
      setError('Error al cargar la propiedad');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number | null) => {
    if (!price) return 'Precio a consultar';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('¡Link copiado!');
    setShowShareMenu(false);
  };

  const shareWhatsApp = () => {
    const text = `${property?.title} - ${formatPrice(property?.price)}`;
    const url = window.location.href;
    window.open(`https://wa.me/?text=${encodeURIComponent(text + '\n' + url)}`, '_blank');
    setShowShareMenu(false);
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: property?.title,
          text: `${property?.title} - ${formatPrice(property?.price)}`,
          url: window.location.href,
        });
        setShowShareMenu(false);
      } catch (err) {
        console.log('Share cancelled');
      }
    }
  };

  if (loading) {
    return (
      <MobileLayout title="Cargando..." showBack={true} showTabs={false}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center py-12">
            <div className="text-5xl mb-4 animate-pulse">🏠</div>
            <div className="text-lg" style={{ color: '#0F172A' }}>Cargando propiedad...</div>
          </div>
        </div>
      </MobileLayout>
    );
  }

  if (error || !property) {
    return (
      <MobileLayout title="Error" showBack={true} showTabs={false}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center px-6">
            <div className="text-5xl mb-4">❌</div>
            <h1 className="text-2xl font-bold mb-2" style={{ color: '#0F172A' }}>
              {error || 'Propiedad no encontrada'}
            </h1>
            <button
              onClick={() => router.push('/')}
              className="mt-6 px-6 py-3 rounded-xl font-bold text-white shadow-lg active:scale-95 transition-transform"
              style={{ backgroundColor: '#2563EB' }}
            >
              ← Volver al inicio
            </button>
          </div>
        </div>
      </MobileLayout>
    );
  }

  const photos = property.photos && property.photos.length > 0 
    ? property.photos 
    : ['https://via.placeholder.com/800x600?text=No+Image'];

  return (
    <MobileLayout title={property.city || 'Propiedad'} showBack={true} showTabs={false}>
      {/* Photo Gallery */}
      <div className="relative">
        <div className="relative aspect-[4/3] bg-gray-200">
          <Image
            src={photos[selectedPhotoIndex]}
            alt={property.title}
            fill
            className="object-cover"
            priority
          />
          
          {/* Photo Counter */}
          {photos.length > 1 && (
            <div 
              className="absolute bottom-4 right-4 px-3 py-1.5 rounded-full text-sm font-bold shadow-lg"
              style={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', color: 'white' }}
            >
              {selectedPhotoIndex + 1} / {photos.length}
            </div>
          )}

          {/* Navigation Arrows */}
          {photos.length > 1 && (
            <>
              <button
                onClick={() => setSelectedPhotoIndex(prev => prev > 0 ? prev - 1 : photos.length - 1)}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center shadow-xl active:scale-90 transition-transform"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)' }}
              >
                <svg className="w-6 h-6" fill="none" stroke="#0F172A" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={() => setSelectedPhotoIndex(prev => prev < photos.length - 1 ? prev + 1 : 0)}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center shadow-xl active:scale-90 transition-transform"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)' }}
              >
                <svg className="w-6 h-6" fill="none" stroke="#0F172A" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}
        </div>

        {/* Thumbnail Scroll */}
        {photos.length > 1 && (
          <div className="flex gap-2 overflow-x-auto px-4 py-3 bg-white">
            {photos.map((photo, index) => (
              <button
                key={index}
                onClick={() => setSelectedPhotoIndex(index)}
                className={`relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all active:scale-95 ${
                  index === selectedPhotoIndex 
                    ? 'scale-110 shadow-lg' 
                    : ''
                }`}
                style={{ borderColor: index === selectedPhotoIndex ? '#2563EB' : '#E5E7EB' }}
              >
                <Image
                  src={photo}
                  alt={`Photo ${index + 1}`}
                  fill
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-4 pt-4 pb-24 space-y-4">
        {/* Price Card */}
        <div 
          className="rounded-2xl p-5 shadow-lg"
          style={{ backgroundColor: '#FFFFFF' }}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h1 className="text-2xl font-bold mb-2" style={{ color: '#0F172A' }}>
                {property.title}
              </h1>
              <p className="text-sm opacity-70 flex items-center gap-1" style={{ color: '#0F172A' }}>
                <span>📍</span>
                {property.address}
                {property.city && property.state && (
                  <span>, {property.city}, {property.state}</span>
                )}
              </p>
            </div>
          </div>

          <div className="text-3xl font-bold mb-4" style={{ color: '#2563EB' }}>
            {formatPrice(property.price)}
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-3">
            {property.bedrooms && (
              <div className="text-center p-3 rounded-xl" style={{ backgroundColor: '#F5EAD3' }}>
                <div className="text-2xl mb-1">🛏️</div>
                <div className="text-lg font-bold" style={{ color: '#0F172A' }}>{property.bedrooms}</div>
                <div className="text-xs opacity-70" style={{ color: '#0F172A' }}>Hab</div>
              </div>
            )}
            {property.bathrooms && (
              <div className="text-center p-3 rounded-xl" style={{ backgroundColor: '#F5EAD3' }}>
                <div className="text-2xl mb-1">🚿</div>
                <div className="text-lg font-bold" style={{ color: '#0F172A' }}>{property.bathrooms}</div>
                <div className="text-xs opacity-70" style={{ color: '#0F172A' }}>Baños</div>
              </div>
            )}
            {property.sqft && (
              <div className="text-center p-3 rounded-xl" style={{ backgroundColor: '#F5EAD3' }}>
                <div className="text-2xl mb-1">📏</div>
                <div className="text-lg font-bold" style={{ color: '#0F172A' }}>{property.sqft.toLocaleString()}</div>
                <div className="text-xs opacity-70" style={{ color: '#0F172A' }}>ft²</div>
              </div>
            )}
            {property.property_type && (
              <div className="text-center p-3 rounded-xl" style={{ backgroundColor: '#F5EAD3' }}>
                <div className="text-2xl mb-1">🏡</div>
                <div className="text-xs font-bold capitalize" style={{ color: '#0F172A' }}>{property.property_type}</div>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <div 
          className="rounded-2xl p-5 shadow-lg"
          style={{ backgroundColor: '#FFFFFF' }}
        >
          <h2 className="text-lg font-bold mb-3" style={{ color: '#0F172A' }}>
            Descripción
          </h2>
          <p className="whitespace-pre-line leading-relaxed opacity-90" style={{ color: '#0F172A' }}>
            {property.description}
          </p>
          
          <div className="mt-4 pt-4 border-t text-sm opacity-60" style={{ color: '#0F172A', borderTopColor: '#E5E7EB' }}>
            👁️ {property.views} personas vieron esta propiedad
          </div>
        </div>

        {/* Export PDF Button */}
        <div className="px-4 pb-6">
          <button
            onClick={async () => {
              const { exportPropertyToPDF } = await import('@/lib/exportPDF');
              await exportPropertyToPDF(property);
            }}
            className="w-full py-3 rounded-xl font-bold border-2 shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2"
            style={{ 
              borderColor: '#2563EB',
              color: '#2563EB',
              backgroundColor: '#FFFFFF'
            }}
          >
            <span>📄</span> Descargar como PDF
          </button>
        </div>

        {/* Agent Card */}
        <div 
          className="rounded-2xl p-5 shadow-lg"
          style={{ backgroundColor: '#FFFFFF' }}
        >
          <h3 className="text-lg font-bold mb-4" style={{ color: '#0F172A' }}>
            Agente
          </h3>

          <div className="flex items-center gap-4 mb-5">
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-lg"
              style={{ backgroundColor: '#2563EB' }}
            >
              {property.agent.profile_photo ? (
                <Image
                  src={property.agent.profile_photo}
                  alt={property.agent.name || 'Agent'}
                  width={64}
                  height={64}
                  className="rounded-full"
                />
              ) : (
                property.agent.name?.charAt(0).toUpperCase() || '?'
              )}
            </div>
            <div>
              <div className="font-bold" style={{ color: '#0F172A' }}>
                {property.agent.full_name || property.agent.name || 'Agente'}
              </div>
              {property.agent.brokerage && (
                <div className="text-sm opacity-70" style={{ color: '#0F172A' }}>
                  {property.agent.brokerage}
                </div>
              )}
            </div>
          </div>

          {/* Contact Buttons */}
          <div className="space-y-2">
            {property.agent.phone && (
              <>
                <a
                  href={`tel:${property.agent.phone}`}
                  className="block w-full py-3 rounded-xl font-bold text-white text-center shadow-lg active:scale-95 transition-transform"
                  style={{ backgroundColor: '#2563EB' }}
                >
                  📞 Llamar
                </a>
                
                <a
                  href={`https://wa.me/${property.agent.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola, me interesa: ${property.title}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full py-3 rounded-xl font-bold text-white text-center shadow-lg active:scale-95 transition-transform"
                  style={{ backgroundColor: '#25D366' }}
                >
                  💬 WhatsApp
                </a>
              </>
            )}

            <a
              href={`mailto:${property.agent.email}?subject=${encodeURIComponent(`Consulta: ${property.title}`)}`}
              className="block w-full py-3 rounded-xl font-bold text-center border-2 shadow-lg active:scale-95 transition-transform"
              style={{ 
                borderColor: '#2563EB',
                color: '#2563EB',
                backgroundColor: '#FFFFFF'
              }}
            >
              ✉️ Email
            </a>
          </div>
        </div>
      </div>

      {/* Floating Share Button */}
      <div className="fixed bottom-6 right-4 z-50">
        <button
          onClick={() => setShowShareMenu(!showShareMenu)}
          className="w-14 h-14 rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-transform"
          style={{ backgroundColor: '#2563EB' }}
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
        </button>

        {/* Share Menu */}
        {showShareMenu && (
          <div 
            className="absolute bottom-16 right-0 rounded-2xl shadow-2xl p-3 min-w-[180px]"
            style={{ backgroundColor: '#FFFFFF' }}
          >
            {navigator.share && (
              <button
                onClick={shareNative}
                className="w-full px-4 py-3 text-left font-semibold rounded-xl active:bg-gray-100 transition-colors flex items-center gap-3"
                style={{ color: '#0F172A' }}
              >
                <span>📱</span> Compartir
              </button>
            )}
            <button
              onClick={shareWhatsApp}
              className="w-full px-4 py-3 text-left font-semibold rounded-xl active:bg-gray-100 transition-colors flex items-center gap-3"
              style={{ color: '#0F172A' }}
            >
              <span>💬</span> WhatsApp
            </button>
            <button
              onClick={copyLink}
              className="w-full px-4 py-3 text-left font-semibold rounded-xl active:bg-gray-100 transition-colors flex items-center gap-3"
              style={{ color: '#0F172A' }}
            >
              <span>🔗</span> Copiar link
            </button>
          </div>
        )}
      </div>

      {/* Overlay para cerrar menú */}
      {showShareMenu && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => setShowShareMenu(false)}
        />
      )}
    </MobileLayout>
  );
}