'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import MobileLayout from '@/components/MobileLayout';
import Image from 'next/image';

interface PropertyData {
  title: string;
  description: string;
  price: number | null;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  bedrooms: number | null;
  bathrooms: number | null;
  sqft: number | null;
  property_type: string;
  photos: string[];
  status: string;
}

export default function EditPropertyPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const propertyId = params.id as string;

  const [property, setProperty] = useState<PropertyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (propertyId) {
      loadProperty();
    }
  }, [propertyId]);

  const loadProperty = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/property/get/${propertyId}`);
      
      if (!response.ok) {
        throw new Error('No se pudo cargar la propiedad');
      }
      
      const data = await response.json();
      setProperty(data.property);
    } catch (err) {
      console.error('Error loading property:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar la propiedad');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!property) return;

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/property/update/${propertyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(property),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al guardar');
      }

      alert('✅ Propiedad actualizada');
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar la propiedad');
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <MobileLayout title="Cargando..." showBack={true} showTabs={false}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center py-12">
            <div className="text-5xl mb-4 animate-pulse">✏️</div>
            <div className="text-lg" style={{ color: '#0F172A' }}>Cargando propiedad...</div>
          </div>
        </div>
      </MobileLayout>
    );
  }

  if (!session || !property) {
    return null;
  }

  return (
    <MobileLayout title="Editar Propiedad" showBack={true} showTabs={false}>
      <div className="px-4 pt-4 pb-24 space-y-4">
        {/* Error Message */}
        {error && (
          <div 
            className="rounded-2xl p-4 border-2"
            style={{ 
              backgroundColor: '#FEE2E2',
              borderColor: '#DC2626',
              color: '#DC2626'
            }}
          >
            {error}
          </div>
        )}

        {/* Photos Preview */}
        <div 
          className="rounded-2xl p-4 shadow-lg"
          style={{ backgroundColor: '#FFFFFF' }}
        >
          <h3 className="font-bold mb-3" style={{ color: '#0F172A' }}>
            Fotos ({property.photos.length})
          </h3>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {property.photos.map((photo, index) => (
              <div key={index} className="relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden">
                <Image
                  src={photo}
                  alt={`Photo ${index + 1}`}
                  fill
                  className="object-cover"
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            <button
              type="button"
              onClick={() => {/* abrir selector de nuevas fotos */}}
              className="flex-1 py-2 rounded-xl font-bold text-white"
              style={{ backgroundColor: '#2563EB' }}
            >
              ➕ Agregar Fotos
            </button>
          </div>
          <p className="text-xs mt-2 opacity-70" style={{ color: '#0F172A' }}>
            💡 Las fotos no se pueden editar por ahora
          </p>
        </div>

        {/* Title */}
        <div 
          className="rounded-2xl p-4 shadow-lg"
          style={{ backgroundColor: '#FFFFFF' }}
        >
          <label className="block text-sm font-bold mb-2" style={{ color: '#0F172A' }}>
            Título
          </label>
          <input
            type="text"
            value={property.title}
            onChange={(e) => setProperty({ ...property, title: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none"
            style={{ 
              borderColor: '#E5E7EB',
              backgroundColor: '#F9FAFB',
              color: '#0F172A'
            }}
          />
        </div>

        {/* Description */}
        <div 
          className="rounded-2xl p-4 shadow-lg"
          style={{ backgroundColor: '#FFFFFF' }}
        >
          <label className="block text-sm font-bold mb-2" style={{ color: '#0F172A' }}>
            Descripción
          </label>
          <textarea
            value={property.description}
            onChange={(e) => setProperty({ ...property, description: e.target.value })}
            rows={8}
            className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none resize-none"
            style={{ 
              borderColor: '#E5E7EB',
              backgroundColor: '#F9FAFB',
              color: '#0F172A'
            }}
          />
        </div>

        {/* Price and Details */}
        <div 
          className="rounded-2xl p-4 shadow-lg space-y-4"
          style={{ backgroundColor: '#FFFFFF' }}
        >
          <h3 className="font-bold" style={{ color: '#0F172A' }}>
            Detalles
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#0F172A' }}>
                Precio ($)
              </label>
              <input
                type="number"
                value={property.price || ''}
                onChange={(e) => setProperty({ ...property, price: Number(e.target.value) || null })}
                className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none"
                style={{ 
                  borderColor: '#E5E7EB',
                  backgroundColor: '#F9FAFB',
                  color: '#0F172A'
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#0F172A' }}>
                Tipo
              </label>
              <select
                value={property.property_type}
                onChange={(e) => setProperty({ ...property, property_type: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none appearance-none"
                style={{ 
                  borderColor: '#E5E7EB',
                  backgroundColor: '#F9FAFB',
                  color: '#0F172A'
                }}
              >
                <option value="house">Casa</option>
                <option value="condo">Condominio</option>
                <option value="apartment">Apartamento</option>
                <option value="land">Terreno</option>
                <option value="commercial">Comercial</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#0F172A' }}>
                Habitaciones
              </label>
              <input
                type="number"
                value={property.bedrooms || ''}
                onChange={(e) => setProperty({ ...property, bedrooms: Number(e.target.value) || null })}
                className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none"
                style={{ 
                  borderColor: '#E5E7EB',
                  backgroundColor: '#F9FAFB',
                  color: '#0F172A'
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#0F172A' }}>
                Baños
              </label>
              <input
                type="number"
                step="0.5"
                value={property.bathrooms || ''}
                onChange={(e) => setProperty({ ...property, bathrooms: Number(e.target.value) || null })}
                className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none"
                style={{ 
                  borderColor: '#E5E7EB',
                  backgroundColor: '#F9FAFB',
                  color: '#0F172A'
                }}
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-semibold mb-2" style={{ color: '#0F172A' }}>
                Pies cuadrados
              </label>
              <input
                type="number"
                value={property.sqft || ''}
                onChange={(e) => setProperty({ ...property, sqft: Number(e.target.value) || null })}
                className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none"
                style={{ 
                  borderColor: '#E5E7EB',
                  backgroundColor: '#F9FAFB',
                  color: '#0F172A'
                }}
              />
            </div>
          </div>
        </div>

        {/* Location */}
        <div 
          className="rounded-2xl p-4 shadow-lg space-y-4"
          style={{ backgroundColor: '#FFFFFF' }}
        >
          <h3 className="font-bold" style={{ color: '#0F172A' }}>
            Ubicación
          </h3>

          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#0F172A' }}>
              Dirección
            </label>
            <input
              type="text"
              value={property.address}
              onChange={(e) => setProperty({ ...property, address: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none"
              style={{ 
                borderColor: '#E5E7EB',
                backgroundColor: '#F9FAFB',
                color: '#0F172A'
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#0F172A' }}>
                Ciudad
              </label>
              <input
                type="text"
                value={property.city}
                onChange={(e) => setProperty({ ...property, city: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none"
                style={{ 
                  borderColor: '#E5E7EB',
                  backgroundColor: '#F9FAFB',
                  color: '#0F172A'
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#0F172A' }}>
                Estado
              </label>
              <input
                type="text"
                value={property.state}
                onChange={(e) => setProperty({ ...property, state: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none"
                style={{ 
                  borderColor: '#E5E7EB',
                  backgroundColor: '#F9FAFB',
                  color: '#0F172A'
                }}
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-semibold mb-2" style={{ color: '#0F172A' }}>
                Código Postal
              </label>
              <input
                type="text"
                value={property.zip_code}
                onChange={(e) => setProperty({ ...property, zip_code: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none"
                style={{ 
                  borderColor: '#E5E7EB',
                  backgroundColor: '#F9FAFB',
                  color: '#0F172A'
                }}
              />
            </div>
          </div>
        </div>

        {/* Status */}
        <div 
          className="rounded-2xl p-4 shadow-lg"
          style={{ backgroundColor: '#FFFFFF' }}
        >
          <label className="block text-sm font-bold mb-2" style={{ color: '#0F172A' }}>
            Estado de la propiedad
          </label>
          <select
            value={property.status}
            onChange={(e) => setProperty({ ...property, status: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none appearance-none"
            style={{ 
              borderColor: '#E5E7EB',
              backgroundColor: '#F9FAFB',
              color: '#0F172A'
            }}
          >
            <option value="active">Activa</option>
            <option value="pending">Pendiente</option>
            <option value="sold">Vendida</option>
          </select>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => router.back()}
            className="flex-1 py-3 rounded-xl font-bold border-2 active:scale-95 transition-transform"
            style={{ 
              borderColor: '#E5E7EB',
              color: '#0F172A',
              backgroundColor: '#FFFFFF'
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3 rounded-xl font-bold text-white shadow-lg active:scale-95 transition-transform disabled:opacity-50"
            style={{ backgroundColor: '#2563EB' }}
          >
            {saving ? 'Guardando...' : '💾 Guardar'}
          </button>
        </div>
      </div>
    </MobileLayout>
  );
}