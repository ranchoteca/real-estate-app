'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import MobileLayout from '@/components/MobileLayout';
import Image from 'next/image';
import imageCompression from 'browser-image-compression';
import { applyWatermark, WatermarkConfig } from '@/lib/watermark';
import MapEditor from '@/components/property/MapEditor';

interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  is_default: boolean;
}

interface PropertyData {
  title: string;
  description: string;
  price: number | null;
  currency_id: string | null;
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
  listing_type: string;
  latitude: number | null;
  longitude: number | null;
  plus_code: string | null;
  show_map: boolean;
  custom_fields_data: Record<string, string>;
}

interface CustomField {
  id: string;
  property_type: string;
  listing_type: string;
  field_key: string;   
  field_name: string;
  field_type: 'text' | 'number';
  placeholder: string;
  icon: string;
}

export default function EditPropertyPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const propertyId = params.id as string;

  const [property, setProperty] = useState<PropertyData | null>(null);
  const [propertySlug, setPropertySlug] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Estados para editar fotos
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]);
  const [newPhotos, setNewPhotos] = useState<File[]>([]);
  const [newPhotosPreviews, setNewPhotosPreviews] = useState<string[]>([]);
  const [photosToDelete, setPhotosToDelete] = useState<string[]>([]);

  // Estados para campos personalizados
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [customFieldsValues, setCustomFieldsValues] = useState<Record<string, string>>({});
  const [loadingCustomFields, setLoadingCustomFields] = useState(false);
  const [watermarkConfig, setWatermarkConfig] = useState<WatermarkConfig | null>(null);

  // Divisas
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState<string | null>(null);

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

  // Cargar campos personalizados cuando cambia property_type o listing_type
  useEffect(() => {
    if (property?.property_type && property?.listing_type) {
      loadCustomFields(property.property_type, property.listing_type);
    }
  }, [property?.property_type, property?.listing_type]);

  useEffect(() => {
    if (session) {
      loadCurrencies();
      loadWatermarkConfig();
    }
  }, [session]);

  const loadWatermarkConfig = async () => {
    try {
      const response = await fetch('/api/agent/profile');
      if (response.ok) {
        const data = await response.json();
        setWatermarkConfig({
          logoUrl: data.agent.watermark_logo || null,
          position: data.agent.watermark_position || 'bottom-right',
          size: data.agent.watermark_size || 'medium',
        });
      }
    } catch (err) {
      console.error('Error loading watermark config:', err);
    }
  };

  const loadCurrencies = async () => {
    try {
      const response = await fetch('/api/currencies/list');
      if (response.ok) {
        const data = await response.json();
        setCurrencies(data.currencies || []);
      }
    } catch (err) {
      console.error('Error al cargar divisas:', err);
    }
  };

  const loadProperty = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/property/get/${propertyId}`);
      
      if (!response.ok) {
        throw new Error('No se pudo cargar la propiedad');
      }
      
      const data = await response.json();
      setProperty(data.property);
      setPropertySlug(data.property.slug);
      setExistingPhotos(data.property.photos || []);
      setSelectedCurrency(data.property.currency_id); 
      
      // Cargar valores de campos personalizados
      setCustomFieldsValues(data.property.custom_fields_data || {});
    } catch (err: any) {
      console.error('Error loading property:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Función para cargar campos personalizados
  const loadCustomFields = async (propertyType: string, listingType: string) => {
    try {
      setLoadingCustomFields(true);
      const response = await fetch(
        `/api/custom-fields/list?property_type=${propertyType}&listing_type=${listingType}`
      );
      
      if (!response.ok) {
        console.error('Error al cargar campos personalizados');
        setCustomFields([]);
        return;
      }
      
      const data = await response.json();
      setCustomFields(data.fields || []);
      console.log(`📋 Campos cargados para ${propertyType} > ${listingType}:`, data.fields?.length || 0);
    } catch (err) {
      console.error('Error loading custom fields:', err);
      setCustomFields([]);
    } finally {
      setLoadingCustomFields(false);
    }
  };

  // Función para actualizar valor de campo personalizado
  const handleCustomFieldChange = (fieldKey: string, value: string) => {
    setCustomFieldsValues(prev => ({
      ...prev,
      [fieldKey]: value
    }));
  };

  // Función para obtener valor de campo personalizado
  const getCustomFieldValue = (fieldKey: string): string => {
    return customFieldsValues[fieldKey] || '';
  };

  const compressImage = async (file: File): Promise<File> => {
    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      fileType: 'image/jpeg',
    };

    try {
      const compressedFile = await imageCompression(file, options);
      return compressedFile;
    } catch (error) {
      console.error('Error comprimiendo imagen:', error);
      return file;
    }
  };

  const handleAddPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const totalPhotos = existingPhotos.length + newPhotos.length + files.length - photosToDelete.length;
    
    if (totalPhotos > 10) {
      alert('Máximo 10 fotos por propiedad');
      return;
    }

    // Comprimir fotos
    const compressedFiles = await Promise.all(files.map(f => compressImage(f)));
    
    // Aplicar watermark
    const processedFiles: File[] = [];
    for (const file of compressedFiles) {
      let finalFile = file;
      if (watermarkConfig) {
        try {
          finalFile = await applyWatermark(file, watermarkConfig);
          console.log('✅ Watermark aplicado a', file.name);
        } catch (err) {
          console.error('Error aplicando watermark:', err);
          finalFile = file;
        }
      }
      processedFiles.push(finalFile);
    }
    
    const previews = processedFiles.map(file => URL.createObjectURL(file));
    
    setNewPhotos([...newPhotos, ...processedFiles]);
    setNewPhotosPreviews([...newPhotosPreviews, ...previews]);
  };

  const handleDeleteExistingPhoto = (url: string) => {
    setExistingPhotos(existingPhotos.filter(p => p !== url));
    setPhotosToDelete([...photosToDelete, url]);
  };

  const handleDeleteNewPhoto = (index: number) => {
    URL.revokeObjectURL(newPhotosPreviews[index]);
    setNewPhotos(newPhotos.filter((_, i) => i !== index));
    setNewPhotosPreviews(newPhotosPreviews.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!property) return;

    const totalPhotos = existingPhotos.length + newPhotos.length;
    if (totalPhotos < 2) {
      setError('Mínimo 2 fotos requeridas');
      return;
    }

    // Validar coordenadas Y Plus Code si show_map está activo
    if (property.show_map) {
      if (!property.latitude || !property.longitude) {
        setError('Debes configurar la ubicación en el mapa');
        return;
      }
      if (!property.plus_code) {
        setError('El Plus Code no se generó correctamente');
        return;
      }
    }

    setSaving(true);
    setError(null);

    try {
      // 1. Subir fotos nuevas si hay
      let uploadedUrls: string[] = [];
      if (newPhotos.length > 0) {
        const formData = new FormData();
        newPhotos.forEach(file => formData.append('photos', file));
        formData.append('propertySlug', propertySlug);

        const uploadResponse = await fetch('/api/property/upload-photos', {
          method: 'POST',
          body: formData,
        });

        if (!uploadResponse.ok) throw new Error('Error al subir fotos');
        
        const uploadData = await uploadResponse.json();
        uploadedUrls = uploadData.urls;
      }

      // 2. Combinar fotos existentes + nuevas
      const allPhotos = [...existingPhotos, ...uploadedUrls];

      // 3. Actualizar propiedad (CON plus_code)
      const response = await fetch(`/api/property/update/${propertyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...property,
          photos: allPhotos,
          photosToDelete,
          custom_fields_data: customFieldsValues,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al guardar');
      }

      alert('✅ Propiedad actualizada');
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <MobileLayout title="Cargando..." showBack={true} showTabs={true}>
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

  const totalPhotos = existingPhotos.length + newPhotos.length;

  return (
    <MobileLayout title="Editar Propiedad" showBack={true} showTabs={true}>
      <div className="px-4 py-6 space-y-4">
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

        {/* Photos Editor */}
        <div 
          className="rounded-2xl p-4 shadow-lg"
          style={{ backgroundColor: '#FFFFFF' }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold" style={{ color: '#0F172A' }}>
              Fotos ({totalPhotos}/10)
            </h3>
            <label className="cursor-pointer">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleAddPhotos}
                className="hidden"
                disabled={totalPhotos >= 10}
              />
              <span 
                className="px-4 py-2 rounded-xl font-semibold text-white shadow-lg active:scale-95 transition-transform inline-block"
                style={{ backgroundColor: totalPhotos >= 10 ? '#9CA3AF' : '#2563EB' }}
              >
                ➕ Agregar
              </span>
            </label>
          </div>

          {/* Existing Photos */}
          {existingPhotos.length > 0 && (
            <div>
              <p className="text-xs mb-2 opacity-70" style={{ color: '#0F172A' }}>
                Fotos actuales:
              </p>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {existingPhotos.map((photo, index) => (
                  <div key={photo} className="relative aspect-square rounded-xl overflow-hidden">
                    <Image
                      src={photo}
                      alt={`Photo ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                    <button
                      onClick={() => handleDeleteExistingPhoto(photo)}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center bg-red-500 text-white shadow-lg active:scale-90 transition-transform"
                    >
                      ✕
                    </button>
                    {index === 0 && (
                      <div className="absolute bottom-1 left-1 px-2 py-0.5 rounded text-xs font-bold text-white" style={{ backgroundColor: '#2563EB' }}>
                        Principal
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New Photos */}
          {newPhotos.length > 0 && (
            <div>
              <p className="text-xs mb-2 opacity-70" style={{ color: '#0F172A' }}>
                Fotos nuevas:
              </p>
              <div className="grid grid-cols-3 gap-2">
                {newPhotosPreviews.map((preview, index) => (
                  <div key={index} className="relative aspect-square rounded-xl overflow-hidden">
                    <Image
                      src={preview}
                      alt={`New ${index + 1}`}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                    <button
                      onClick={() => handleDeleteNewPhoto(index)}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center bg-red-500 text-white shadow-lg active:scale-90 transition-transform"
                    >
                      ✕
                    </button>
                    <div className="absolute bottom-1 left-1 px-2 py-0.5 rounded text-xs font-bold text-white bg-green-500">
                      Nueva
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {totalPhotos < 2 && (
            <p className="text-xs mt-2" style={{ color: '#DC2626' }}>
              ⚠️ Mínimo 2 fotos requeridas
            </p>
          )}
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
                Precio ({currencies.find(c => c.id === (selectedCurrency || property.currency_id))?.symbol || '$'})
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
                Tipo de Listing
              </label>
              <select
                value={property.listing_type || 'sale'}
                onChange={(e) => setProperty({ ...property, listing_type: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none appearance-none"
                style={{ 
                  borderColor: '#E5E7EB',
                  backgroundColor: '#F9FAFB',
                  color: '#0F172A'
                }}
              >
                <option value="sale">Venta</option>
                <option value="rent">Alquiler</option>
              </select>
            </div>
            {/* NUEVO: Selector de Divisa */}
            <div className="col-span-2">
              <label className="block text-sm font-semibold mb-2" style={{ color: '#0F172A' }}>
                💰 Divisa
              </label>
              <select
                value={selectedCurrency || property.currency_id || ''}
                onChange={(e) => {
                  const newCurrencyId = e.target.value;
                  setSelectedCurrency(newCurrencyId);
                  setProperty({ ...property, currency_id: newCurrencyId });
                }}
                className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none appearance-none"
                style={{ 
                  borderColor: '#E5E7EB',
                  backgroundColor: '#F9FAFB',
                  color: '#0F172A'
                }}
              >
                {currencies.map(currency => (
                  <option key={currency.id} value={currency.id}>
                    {currency.symbol} {currency.code} - {currency.name}
                  </option>
                ))}
              </select>
              <p className="text-xs mt-1" style={{ color: '#6B7280' }}>
                💡 Puedes cambiar tu divisa por defecto en Configuración
              </p>
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

          {/* MAP SECTION (CON PLUS CODE) */}
          <div className="pt-4 border-t" style={{ borderTopColor: '#E5E7EB' }}>
            <label className="flex items-center gap-2 cursor-pointer mb-3">
              <input
                type="checkbox"
                checked={property.show_map}
                onChange={(e) => setProperty({ 
                  ...property, 
                  show_map: e.target.checked 
                })}
                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-semibold" style={{ color: '#0F172A' }}>
                🗺️ Mostrar ubicación en mapa
              </span>
            </label>

            {property.show_map && (
              <MapEditor
                address={property.address}
                city={property.city}
                state={property.state}
                initialLat={property.latitude}
                initialLng={property.longitude}
                initialPlusCode={property.plus_code}
                onLocationChange={(lat, lng, plusCode) => {
                  console.log('📍 Nueva ubicación:', lat, lng, plusCode);
                  setProperty({ 
                    ...property, 
                    latitude: lat, 
                    longitude: lng,
                    plus_code: plusCode
                  });
                }}
                editable={true}
              />
            )}
          </div>
        </div>

        {/* Campos Personalizados */}
        <div 
          className="rounded-2xl p-4 shadow-lg space-y-4"
          style={{ backgroundColor: '#FFFFFF' }}
        >
          <div className="flex items-center justify-between">
            <h3 className="font-bold" style={{ color: '#0F172A' }}>
              🏷️ Campos Personalizados
            </h3>
            <button
              onClick={() => router.push('/settings/custom-fields')}
              className="text-xs font-semibold underline"
              style={{ color: '#2563EB' }}
            >
              Gestionar campos
            </button>
          </div>

          {loadingCustomFields ? (
            <div className="text-center py-4">
              <div className="text-3xl mb-2 animate-pulse">⏳</div>
              <p className="text-sm opacity-70" style={{ color: '#0F172A' }}>
                Cargando campos...
              </p>
            </div>
          ) : customFields.length > 0 ? (
            <div className="space-y-3">
              {customFields.map((field) => (
                <div key={field.id}>
                  <label className="block text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: '#0F172A' }}>
                    <span className="text-lg">{field.icon || '🏷️'}</span>
                    {field.field_name}
                  </label>
                  <input
                    type={field.field_type === 'number' ? 'number' : 'text'}
                    value={getCustomFieldValue(field.field_key)}
                    onChange={(e) => handleCustomFieldChange(field.field_key, e.target.value)}
                    placeholder={field.placeholder}
                    maxLength={field.field_type === 'text' ? 200 : undefined}
                    className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none text-gray-900 font-semibold"
                    style={{ 
                      borderColor: '#E5E7EB',
                      backgroundColor: '#F9FAFB'
                    }}
                  />
                </div>
              ))}
              
              <div 
                className="px-3 py-2 rounded-lg text-xs"
                style={{ backgroundColor: '#F0F9FF', color: '#0369A1' }}
              >
                💡 <strong>Tip:</strong> Los campos se guardan automáticamente al actualizar la propiedad. 
                Si cambias el tipo de propiedad, los datos se mantienen y puedes volver a verlos cuando regreses a esta configuración.
              </div>
            </div>
          ) : (
            <div 
              className="rounded-xl p-4 text-center"
              style={{ backgroundColor: '#FEF3C7' }}
            >
              <div className="text-3xl mb-2">📝</div>
              <p className="text-sm font-semibold mb-1" style={{ color: '#92400E' }}>
                No hay campos personalizados para esta combinación
              </p>
              <p className="text-xs opacity-70 mb-3" style={{ color: '#92400E' }}>
                {property?.property_type && property?.listing_type && (
                  <>Tipo: {property.property_type} → {property.listing_type === 'sale' ? 'Venta' : 'Alquiler'}</>
                )}
              </p>
              <button
                onClick={() => router.push('/settings/custom-fields')}
                className="px-4 py-2 rounded-xl font-bold text-white active:scale-95 transition-transform"
                style={{ backgroundColor: '#2563EB' }}
              >
                ➕ Crear campos
              </button>
            </div>
          )}
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
            <option value="rented">Alquilada</option>
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
            disabled={saving || totalPhotos < 2}
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