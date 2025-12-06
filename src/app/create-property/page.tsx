'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import PhotoUploader from '@/components/property/PhotoUploader';
import VoiceRecorder from '@/components/property/VoiceRecorder';
import GoogleMapEditor from '@/components/property/GoogleMapEditor';
import MobileLayout from '@/components/MobileLayout';

import { SUPPORTED_COUNTRIES, CountryCode } from '@/lib/google-maps-config';

interface PropertyData {
  title: string;
  description: string;
  price: number | null;
  currency_id: string | null;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  property_type: string;
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

interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  is_default: boolean;
}

export default function CreatePropertyPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Step 1: Photos
  const [photos, setPhotos] = useState<File[]>([]);
  const [tempPhotoUrls, setTempPhotoUrls] = useState<string[]>([]);
  const [watermarkConfig, setWatermarkConfig] = useState<any>(null);

  // Step 2: Property Configuration
  const [propertyType, setPropertyType] = useState<string>('house');
  const [listingType, setListingType] = useState<string>('sale');
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [loadingCustomFields, setLoadingCustomFields] = useState(false);

  // Currencies
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState<string | null>(null);
  const [agentDefaultCurrency, setAgentDefaultCurrency] = useState<string | null>(null);

  // Step 3: Voice Recording
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  // Step 4: Generated Data
  const [propertyData, setPropertyData] = useState<PropertyData | null>(null);
  const [customFieldsValues, setCustomFieldsValues] = useState<Record<string, string>>({});

  // UI States
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dropdown del país
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>('CR'); // Default Costa Rica

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Cargar divisas y divisa por defecto del agente
  useEffect(() => {
    if (session) {
      loadCurrencies();
      loadAgentDefaultCurrency();
      loadWatermarkConfig();
    }
  }, [session]);

  // Cargar campos personalizados cuando se selecciona tipo de propiedad + listing
  useEffect(() => {
    if (propertyType && listingType) {
      loadCustomFields(propertyType, listingType);
    }
  }, [propertyType, listingType]);

  const loadCurrencies = async () => {
    try {
      const response = await fetch('/api/currencies/list');
      if (response.ok) {
        const data = await response.json();
        setCurrencies(data.currencies || []);
        
        // Si hay una divisa por defecto del sistema y no tenemos seleccionada
        if (data.defaultCurrency && !selectedCurrency) {
          setSelectedCurrency(data.defaultCurrency.id);
        }
      }
    } catch (err) {
      console.error('Error al cargar divisas:', err);
    }
  };

  const loadAgentDefaultCurrency = async () => {
    try {
      const response = await fetch('/api/agent/profile');
      if (response.ok) {
        const data = await response.json();
        if (data.agent.default_currency_id) {
          setAgentDefaultCurrency(data.agent.default_currency_id);
          // Usar la divisa del agente por defecto
          setSelectedCurrency(data.agent.default_currency_id);
        }
      }
    } catch (err) {
      console.error('Error al cargar divisa del agente:', err);
    }
  };

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

  // Detectar país basado en geolocalización
  const detectCountryFromLocation = async (lat: number, lng: number) => {
    // Verificar cada país por sus límites geográficos
    for (const country of SUPPORTED_COUNTRIES) {
      const { bounds } = country;
      if (
        lat >= bounds.south &&
        lat <= bounds.north &&
        lng >= bounds.west &&
        lng <= bounds.east
      ) {
        console.log(`📍 País detectado automáticamente: ${country.name}`);
        setSelectedCountry(country.code);
        return country.code;
      }
    }
    
    // Si no se encuentra, dejar el default (CR)
    console.log('📍 No se detectó país, usando default: Costa Rica');
    return 'CR';
  };

  const loadCustomFields = async (propType: string, listType: string) => {
    try {
      setLoadingCustomFields(true);
      const response = await fetch(
        `/api/custom-fields/list?property_type=${propType}&listing_type=${listType}`
      );
      
      if (!response.ok) {
        console.error('Error al cargar campos personalizados');
        setCustomFields([]);
        return;
      }
      
      const data = await response.json();
      setCustomFields(data.fields || []);
      console.log(`📋 Campos cargados para ${propType} > ${listType}:`, data.fields?.length || 0);
    } catch (err) {
      console.error('Error loading custom fields:', err);
      setCustomFields([]);
    } finally {
      setLoadingCustomFields(false);
    }
  };

  if (status === 'loading') {
    return (
      <MobileLayout title="Crear Propiedad" showBack={true} showTabs={true}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center py-12">
            <div className="text-5xl mb-4 animate-pulse">🏠</div>
            <div className="text-lg" style={{ color: '#0F172A' }}>Cargando...</div>
          </div>
        </div>
      </MobileLayout>
    );
  }

  if (!session) {
    return null;
  }

  const handlePhotosChange = (files: File[]) => {
    setPhotos(files);
  };

  const handleRecordingComplete = (blob: Blob) => {
    setAudioBlob(blob);
  };

  const handleGenerate = async () => {
    if (photos.length < 2) {
      setError('Necesitas al menos 2 fotos');
      return;
    }

    if (!audioBlob) {
      setError('Necesitas grabar la descripción por voz');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // 1. Transcribir audio
      const transcription = await transcribeAudio(audioBlob);

      // 2. Generar descripción con GPT-4
      const generatedData = await generateDescription(
        transcription, 
        propertyType, 
        listingType,
        customFields
      );

      // 3. Actualizar estado con datos generados + divisa seleccionada
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            
            // Detectar país automáticamente
            await detectCountryFromLocation(latitude, longitude);
            
            setPropertyData({
              ...generatedData,
              property_type: propertyType,
              listing_type: listingType,
              currency_id: selectedCurrency,
              latitude: latitude,
              longitude: longitude,
              plus_code: null,
              show_map: true,
              custom_fields_data: generatedData.custom_fields_data || {},
            });
            
            setCustomFieldsValues(generatedData.custom_fields_data || {});
          },
          (error) => {
            console.log('GPS no disponible:', error);
            
            // Sin GPS, usar datos generados sin coordenadas
            setPropertyData({
              ...generatedData,
              property_type: propertyType,
              listing_type: listingType,
              currency_id: selectedCurrency,
              latitude: null,
              longitude: null,
              plus_code: null,
              show_map: true,
              custom_fields_data: generatedData.custom_fields_data || {},
            });
            
            setCustomFieldsValues(generatedData.custom_fields_data || {});
          }
        );
      } else {
        // Navegador no soporta geolocalización
        setPropertyData({
          ...generatedData,
          property_type: propertyType,
          listing_type: listingType,
          currency_id: selectedCurrency,
          latitude: null,
          longitude: null,
          plus_code: null,
          show_map: true,
          custom_fields_data: generatedData.custom_fields_data || {},
        });
        
        setCustomFieldsValues(generatedData.custom_fields_data || {});
      }
    } catch (err) {
      console.error('Error al procesar:', err);
      setError(err instanceof Error ? err.message : 'Error al procesar la propiedad');
    } finally {
      setIsProcessing(false);
    }
  };

  const uploadPhotosWithSlug = async (files: File[], slug: string): Promise<string[]> => {
    const batchSize = 5;
    const allUrls: string[] = [];

    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      const formData = new FormData();
      
      batch.forEach(file => {
        formData.append('photos', file);
      });
      
      formData.append('propertySlug', slug);

      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(files.length / batchSize);
      console.log(`📤 Subiendo lote ${batchNumber}/${totalBatches} (${batch.length} fotos)...`);

      try {
        const response = await fetch('/api/property/upload-photos', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || `Error al subir fotos en lote ${batchNumber}`);
        }

        const data = await response.json();
        allUrls.push(...data.urls);
        console.log(`✅ Lote ${batchNumber} completado (${data.count} fotos)`);
      } catch (error) {
        console.error('Error subiendo fotos:', error);
        throw error;
      }
    }

    console.log(`✅ Total: ${allUrls.length} fotos subidas`);
    return allUrls;
  };

  const transcribeAudio = async (blob: Blob): Promise<string> => {
    const formData = new FormData();
    formData.append('audio', blob, 'recording.webm');

    const response = await fetch('/api/audio/transcribe', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Error al transcribir el audio');
    }

    const data = await response.json();
    return data.transcription;
  };

  const generateDescription = async (
    transcription: string,
    propType: string,
    listType: string,
    fields: CustomField[]
  ): Promise<PropertyData> => {
    const response = await fetch('/api/property/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        transcription,
        property_type: propType,
        listing_type: listType,
        custom_fields: fields,
      }),
    });

    if (!response.ok) {
      throw new Error('Error al generar la descripción');
    }

    const data = await response.json();
    return data.property;
  };

  const handlePublish = async () => {
    if (!propertyData) return;

    // Validar coordenadas Y Plus Code si show_map está activo
    if (propertyData.show_map) {
      if (!propertyData.latitude || !propertyData.longitude) {
        setError('Debes configurar la ubicación en el mapa');
        return;
      }
      if (!propertyData.plus_code) {
        setError('El Plus Code no se generó correctamente');
        return;
      }
    }

    setIsProcessing(true);
    setError(null);

    try {
      console.log('🔍 propertyData COMPLETO:', propertyData);
      console.log('🔍 customFieldsValues:', customFieldsValues);
      console.log('🔍 MERGE de custom_fields_data:', {
        ...propertyData.custom_fields_data,
        ...customFieldsValues,
      });
      console.log('🔍 currency_id seleccionado:', selectedCurrency);
      console.log('🔍 currency_id en propertyData:', propertyData.currency_id);
      
      // 1. Crear la propiedad SIN fotos
      const response = await fetch('/api/property/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...propertyData,
          photos: [],
          custom_fields_data: {
            ...propertyData.custom_fields_data,
            ...customFieldsValues,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al crear la propiedad');
      }

      const { propertyId, slug } = await response.json();
      console.log(`✅ Propiedad creada: ${propertyId}, slug: ${slug}`);
      
      // 2. Subir fotos con el slug real
      console.log(`📤 Subiendo ${photos.length} fotos a la carpeta ${slug}...`);
      const photoUrls = await uploadPhotosWithSlug(photos, slug);
      
      // 3. Actualizar la propiedad con las URLs de las fotos
      const updateResponse = await fetch(`/api/property/update/${propertyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          photos: photoUrls 
        }),
      });

      if (!updateResponse.ok) {
        console.error('⚠️ Error actualizando fotos, pero la propiedad fue creada');
      } else {
        console.log(`✅ Fotos actualizadas en la propiedad`);
      }
      
      // Limpiar estados
      setTempPhotoUrls([]);
      setPhotos([]);
      
      // Redirigir a la propiedad
      router.push(`/p/${slug}`);
      
    } catch (err) {
      console.error('Error al publicar:', err);
      setError(err instanceof Error ? err.message : 'Error al publicar');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCustomFieldChange = (fieldKey: string, value: string) => {
    setCustomFieldsValues(prev => ({
      ...prev,
      [fieldKey]: value
    }));
  };

  const getCustomFieldValue = (fieldKey: string): string => {
    return customFieldsValues[fieldKey] || '';
  };

  const canGenerate = photos.length >= 2 && audioBlob !== null;

  const emptyCustomFields = customFields.filter(field => {
    const value = customFieldsValues[field.field_key];
    return !value || (typeof value === 'string' && value.trim() === '');
  });

  const getSelectedCurrencySymbol = () => {
    if (!selectedCurrency) return '$';
    const currency = currencies.find(c => c.id === selectedCurrency);
    return currency?.symbol || '$';
  };

  return (
    <MobileLayout title="Crear Propiedad" showBack={true} showTabs={true}>
      <div className="px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2" style={{ color: '#0F172A' }}>
            Crear nueva propiedad
          </h1>
          <p className="text-sm" style={{ color: '#64748B' }}>
            Sube fotos, configura el tipo de propiedad y describe por voz. La IA generará el listing completo.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Form Sections */}
        <div className="space-y-6">
          {/* Section 1: Photos */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span>📸</span> Paso 1: Fotos de la Propiedad
            </h2>
            <PhotoUploader 
              onPhotosChange={handlePhotosChange}
              minPhotos={2}
              maxPhotos={10}
              watermarkConfig={watermarkConfig}
            />
          </div>

          {/* Section 2: Property Configuration */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span>🏷️</span> Paso 2: Configuración de Propiedad
            </h2>
            
            <div className="grid grid-cols-1 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de propiedad
                </label>
                <select
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 font-semibold"
                >
                  <option value="house">Casa</option>
                  <option value="condo">Condominio</option>
                  <option value="apartment">Apartamento</option>
                  <option value="land">Terreno</option>
                  <option value="commercial">Comercial</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Listing
                </label>
                <select
                  value={listingType}
                  onChange={(e) => setListingType(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 font-semibold"
                >
                  <option value="sale">Venta</option>
                  <option value="rent">Alquiler</option>
                </select>
              </div>

              {/* NUEVO: Selector de Divisa */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  💰 Divisa
                  {agentDefaultCurrency === selectedCurrency && (
                    <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-semibold">
                      Por defecto
                    </span>
                  )}
                </label>
                <select
                  value={selectedCurrency || ''}
                  onChange={(e) => setSelectedCurrency(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 font-semibold"
                >
                  {currencies.map(currency => (
                    <option key={currency.id} value={currency.id}>
                      {currency.symbol} {currency.code} - {currency.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  💡 Puedes cambiar tu divisa por defecto en Configuración
                </p>
              </div>
            </div>

            {/* Hint de Campos Personalizados */}
            {loadingCustomFields ? (
              <div className="bg-gray-50 border-2 border-gray-200 rounded-2xl p-4 text-center">
                <div className="text-2xl mb-2 animate-pulse">⏳</div>
                <p className="text-sm text-gray-600">Cargando campos personalizados...</p>
              </div>
            ) : customFields.length > 0 ? (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4">
                <div className="flex items-start gap-2 mb-3">
                  <span className="text-2xl">💡</span>
                  <div>
                    <h3 className="font-bold text-blue-900 mb-1">
                      Campos a mencionar en tu grabación:
                    </h3>
                    <p className="text-sm text-blue-700">
                      Menciona estos detalles para que la IA los complete automáticamente
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  {customFields.map(field => (
                    <div key={field.id} className="flex items-center gap-2 text-sm font-semibold text-blue-900">
                      <span className="text-lg">{field.icon}</span>
                      <span>{field.field_name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-4">
                <div className="flex items-start gap-2">
                  <span className="text-2xl">ℹ️</span>
                  <div>
                    <p className="text-sm text-yellow-800 font-semibold mb-1">
                      No hay campos personalizados para esta combinación
                    </p>
                    <button
                      onClick={() => router.push('/settings/custom-fields')}
                      className="text-sm text-blue-600 underline font-semibold"
                    >
                      Crear campos personalizados
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Voice Recording */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span>🎤</span> Paso 3: Descripción por Voz
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Describe la propiedad: ubicación, precio, características especiales{customFields.length > 0 && ', y los campos personalizados mencionados arriba'}.
            </p>
            <VoiceRecorder 
              onRecordingComplete={handleRecordingComplete}
              minDuration={10}
              maxDuration={120}
            />
          </div>

          {/* Generate Button */}
          {!propertyData && (
            <div className="flex justify-center">
              <button
                onClick={handleGenerate}
                disabled={!canGenerate || isProcessing}
                className="px-8 py-4 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Generando con IA...
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    Generar Descripción con IA
                  </>
                )}
              </button>
            </div>
          )}

          {/* Section 4: Generated Preview */}
          {propertyData && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span>✅</span> Paso 4: Revisar y Publicar
              </h2>
              
              <div className="space-y-4">
                {/* Property Type, Listing Type, Currency (NO EDITABLE) */}
                <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Configuración:</p>
                      <p className="font-bold text-gray-900">
                        {propertyType === 'house' ? 'Casa' : 
                         propertyType === 'condo' ? 'Condominio' :
                         propertyType === 'apartment' ? 'Apartamento' :
                         propertyType === 'land' ? 'Terreno' : 'Comercial'}
                        {' → '}
                        {listingType === 'sale' ? 'Venta' : 'Alquiler'}
                        {' → '}
                        {getSelectedCurrencySymbol()} {currencies.find(c => c.id === selectedCurrency)?.code}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setPropertyData(null);
                        setCustomFieldsValues({});
                      }}
                      className="text-sm text-blue-600 underline font-semibold"
                    >
                      Cambiar
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    ℹ️ Para cambiar, debes regenerar el listing
                  </p>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Título
                  </label>
                  <input
                    type="text"
                    value={propertyData.title}
                    onChange={(e) => setPropertyData({ ...propertyData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 font-semibold"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción
                  </label>
                  <textarea
                    value={propertyData.description}
                    onChange={(e) => setPropertyData({ ...propertyData, description: e.target.value })}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  />
                </div>

                {/* Price con símbolo de divisa */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Precio ({getSelectedCurrencySymbol()})
                  </label>
                  <input
                    type="number"
                    value={propertyData.price || ''}
                    onChange={(e) => setPropertyData({ ...propertyData, price: Number(e.target.value) || null })}
                    placeholder="Opcional"
                    className="w-full px-3 py-2 border border-gray-300 text-gray-900 rounded-lg"
                  />
                </div>

                {/* Location */}
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Dirección
                    </label>
                    <input
                      type="text"
                      value={propertyData.address}
                      onChange={(e) => setPropertyData({ ...propertyData, address: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 text-gray-900 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ciudad
                    </label>
                    <input
                      type="text"
                      value={propertyData.city}
                      onChange={(e) => setPropertyData({ ...propertyData, city: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 text-gray-900 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Estado / Provincia
                    </label>
                    <input
                      type="text"
                      value={propertyData.state}
                      onChange={(e) => setPropertyData({ ...propertyData, state: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 text-gray-900 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Código Postal
                    </label>
                    <input
                      type="text"
                      value={propertyData.zip_code}
                      onChange={(e) => setPropertyData({ ...propertyData, zip_code: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 text-gray-900 rounded-lg"
                    />
                  </div>
                </div>

                {/* MAP SECTION */}
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={propertyData.show_map}
                        onChange={(e) => setPropertyData({ 
                          ...propertyData, 
                          show_map: e.target.checked 
                        })}
                        className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        🗺️ Mostrar ubicación en mapa
                      </span>
                    </label>
                  </div>

                  {/* Dropdown de País */}
                  <div className="mb-4">
                    <label className="block text-sm font-semibold mb-2 text-gray-700">
                      🌎 País de la propiedad
                    </label>
                    <select
                      value={selectedCountry}
                      onChange={(e) => setSelectedCountry(e.target.value as CountryCode)}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-base text-gray-900 bg-white font-semibold"
                    >
                      {SUPPORTED_COUNTRIES.map((country) => (
                        <option key={country.code} value={country.code}>
                          {country.flag} {country.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-600 mt-1">
                      {propertyData?.latitude && propertyData?.longitude 
                        ? '📍 País detectado automáticamente por tu ubicación. Cámbialo si la propiedad está en otro país.'
                        : 'Selecciona el país antes de pegar el Plus Code'}
                    </p>
                  </div>

                  {propertyData.show_map && (
                    <GoogleMapEditor
                      address={propertyData.address}
                      city={propertyData.city}
                      state={propertyData.state}
                      selectedCountry={selectedCountry}
                      initialLat={propertyData.latitude}
                      initialLng={propertyData.longitude}
                      initialPlusCode={propertyData.plus_code}
                      onLocationChange={(lat, lng, plusCode) => {
                        setPropertyData({ 
                          ...propertyData, 
                          latitude: lat, 
                          longitude: lng,
                          plus_code: plusCode
                        });
                      }}
                      editable={true}
                    />
                  )}
                </div>

                {/* CUSTOM FIELDS */}
                {customFields.length > 0 && (
                  <div className="pt-4 border-t border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <span>🏷️</span>
                      Campos Personalizados
                    </h3>

                    <div className="space-y-3">
                      {customFields.map((field) => (
                        <div key={field.id}>
                          <label className="block text-sm font-semibold mb-2 flex items-center gap-2 text-gray-700">
                            <span className="text-lg">{field.icon || '🏷️'}</span>
                            {field.field_name}
                          </label>
                          <input
                            type={field.field_type === 'number' ? 'number' : 'text'}
                            value={getCustomFieldValue(field.field_key)}
                            onChange={(e) => handleCustomFieldChange(field.field_key, e.target.value)}
                            placeholder={field.placeholder}
                            maxLength={field.field_type === 'text' ? 200 : undefined}
                            className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none text-gray-900 font-semibold focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            style={{ 
                              borderColor: '#E5E7EB',
                              backgroundColor: '#F9FAFB'
                            }}
                          />
                        </div>
                      ))}
                    </div>

                    {/* Warning si hay campos vacíos */}
                    {emptyCustomFields.length > 0 && (
                      <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <span className="text-xl">⚠️</span>
                          <div>
                            <p className="text-sm font-semibold text-yellow-800 mb-1">
                              Algunos campos personalizados están vacíos:
                            </p>
                            <ul className="text-xs text-yellow-700 space-y-1">
                              {emptyCustomFields.map(field => (
                                <li key={field.id}>• {field.icon} {field.field_name}</li>
                              ))}
                            </ul>
                            <p className="text-xs text-yellow-600 mt-2">
                              Puedes publicar de todas formas, pero te recomendamos llenarlos para una mejor presentación.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Publish Button */}
                <div className="flex gap-4 pt-4">
                  <button
                    onClick={() => {
                      setPropertyData(null);
                      setCustomFieldsValues({});
                    }}
                    className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handlePublish}
                    disabled={isProcessing}
                    className="flex-1 px-6 py-3 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 disabled:opacity-50"
                  >
                    {isProcessing ? 'Publicando...' : '🚀 Publicar Propiedad'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </MobileLayout>
  );
}