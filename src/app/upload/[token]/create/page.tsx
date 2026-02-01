'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import PhotoUploader from '@/components/property/PhotoUploader';
import VoiceRecorder from '@/components/property/VoiceRecorder';
import GoogleMapEditor from '@/components/property/GoogleMapEditor';
import MobileLayout from '@/components/MobileLayout';
import { useTranslation } from '@/hooks/useTranslation';
import { useI18nStore } from '@/lib/i18n-store';

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
  language: 'es' | 'en';
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
  field_name_en: string | null;
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

export default function UploadWithTokenCreatePage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useTranslation();
  const { language } = useI18nStore();

  const token = params.token as string;

  const [tokenValid, setTokenValid] = useState(false);
  const [validating, setValidating] = useState(true);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [agentName, setAgentName] = useState('');

  const [photos, setPhotos] = useState<File[]>([]);
  const [watermarkConfig, setWatermarkConfig] = useState<any>(null);

  const [propertyType, setPropertyType] = useState<string>('house');
  const [listingType, setListingType] = useState<string>('sale');
  const [propertyLanguage, setPropertyLanguage] = useState<'es' | 'en'>(language);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [loadingCustomFields, setLoadingCustomFields] = useState(false);

  const [canUseSuggested, setCanUseSuggested] = useState(false);
  const [loadingSuggested, setLoadingSuggested] = useState(false);

  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState<string | null>(null);
  const [agentDefaultCurrency, setAgentDefaultCurrency] = useState<string | null>(null);

  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  const [propertyData, setPropertyData] = useState<PropertyData | null>(null);
  const [customFieldsValues, setCustomFieldsValues] = useState<Record<string, string>>({});

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedCountry, setSelectedCountry] = useState<CountryCode>('CR');

  useEffect(() => {
    validateToken();
  }, [token]);

  useEffect(() => {
    setPropertyLanguage(language);
  }, [language]);

  useEffect(() => {
    if (tokenValid && agentId) {
      loadCurrencies();
      loadAgentDefaultCurrency();
      loadWatermarkConfig();
    }
  }, [tokenValid, agentId]);

  useEffect(() => {
    if (propertyType && listingType && agentId) {
      console.log('🔄 Cargando campos para:', { propertyType, listingType, agentId });
      loadCustomFields(propertyType, listingType);
    }
  }, [propertyType, listingType, agentId]);

  const validateToken = async () => {
    try {
      const response = await fetch('/api/upload-token/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!data.valid) {
        router.push(`/upload/${token}`);
        return;
      }

      setTokenValid(true);
      setAgentId(data.agentId);
      setAgentName(data.agentName);
      
    } catch (err) {
      router.push(`/upload/${token}`);
    } finally {
      setValidating(false);
    }
  };

  const loadCurrencies = async () => {
    try {
      const response = await fetch('/api/currencies/list');
      if (response.ok) {
        const data = await response.json();
        setCurrencies(data.currencies || []);
        
        if (data.defaultCurrency && !selectedCurrency) {
          setSelectedCurrency(data.defaultCurrency.id);
        }
      }
    } catch (err) {
      console.error('Error al cargar divisas:', err);
    }
  };

  const loadAgentDefaultCurrency = async () => {
    if (!agentId) return;
    
    try {
      const response = await fetch(`/api/agent/profile?agent_id=${agentId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.agent.default_currency_id) {
          setAgentDefaultCurrency(data.agent.default_currency_id);
          setSelectedCurrency(data.agent.default_currency_id);
        }
      }
    } catch (err) {
      console.error('Error al cargar divisa del agente:', err);
    }
  };

  const loadWatermarkConfig = async () => {
    if (!agentId) return;
    
    try {
      const response = await fetch(`/api/agent/profile?agent_id=${agentId}`);
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

  const detectCountryFromLocation = async (lat: number, lng: number) => {
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
    
    console.log('📍 No se detectó país, usando default: Costa Rica');
    return 'CR';
  };

  const generatePlusCode = (lat: number, lng: number): string => {
    const CODE_ALPHABET = '23456789CFGHJMPQRVWX';
    const PAIR_CODE_LENGTH = 10;
    
    let latitude = lat;
    let longitude = lng;
    
    latitude = Math.max(-90, Math.min(90, latitude));
    longitude = ((longitude % 360) + 360) % 360;
    if (longitude > 180) longitude -= 360;
    
    latitude += 90;
    longitude += 180;
    
    let code = '';
    let latPlaceValue = 400;
    let lngPlaceValue = 400;
    
    for (let i = 0; i < PAIR_CODE_LENGTH / 2; i++) {
      const latDigit = Math.floor(latitude / latPlaceValue);
      const lngDigit = Math.floor(longitude / lngPlaceValue);
      
      code += CODE_ALPHABET[latDigit];
      code += CODE_ALPHABET[lngDigit];
      
      latitude -= latDigit * latPlaceValue;
      longitude -= lngDigit * lngPlaceValue;
      
      latPlaceValue /= 20;
      lngPlaceValue /= 20;
    }
    
    const formattedCode = code.substring(0, 4) + '+' + code.substring(4, 6);
    console.log('✅ Plus Code generado localmente:', formattedCode);
    return formattedCode;
  };

  const loadCustomFields = async (propType: string, listType: string) => {
    if (!agentId) {
      console.log('⚠️ No hay agentId, saltando carga de campos');
      return;
    }

    console.log('📡 Llamando API con:', { propType, listType, agentId });

    try {
      setLoadingCustomFields(true);
      const response = await fetch(
        `/api/custom-fields/list?property_type=${propType}&listing_type=${listType}&agent_id=${agentId}`
      );
      
      if (!response.ok) {
        console.error('Error al cargar campos personalizados');
        setCustomFields([]);
        setCanUseSuggested(false);
        return;
      }
      
      const data = await response.json();
      const fields = data.fields || [];
      setCustomFields(fields);
      
      setCanUseSuggested(fields.length === 0);
    } catch (err) {
      console.error('Error loading custom fields:', err);
      setCustomFields([]);
      setCanUseSuggested(false);
    } finally {
      setLoadingCustomFields(false);
    }
  };

  const handleUseSuggestedFields = async () => {
    setLoadingSuggested(true);
    
    try {
      const response = await fetch('/api/custom-fields/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property_type: propertyType,
          listing_type: listingType,
          language: propertyLanguage,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al cargar campos sugeridos');
      }

      const data = await response.json();
      console.log(`✅ ${data.count} campos sugeridos creados`);
      
      await loadCustomFields(propertyType, listingType);
      
    } catch (error) {
      console.error('Error cargando campos sugeridos:', error);
      alert(
        propertyLanguage === 'en'
          ? 'Error loading suggested fields'
          : 'Error al cargar campos sugeridos'
      );
    } finally {
      setLoadingSuggested(false);
    }
  };

  if (validating) {
    return (
      <MobileLayout title="Validando acceso..." showBack={false} showTabs={false}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center py-12">
            <div className="text-5xl mb-4 animate-pulse">🔐</div>
            <div className="text-lg text-gray-900">Validando acceso...</div>
          </div>
        </div>
      </MobileLayout>
    );
  }

  if (!tokenValid || !agentId) {
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
      const transcription = await transcribeAudio(audioBlob);

      const generatedData = await generateDescription(
        transcription, 
        propertyType, 
        listingType,
        propertyLanguage,
        customFields
      );

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            
            await detectCountryFromLocation(latitude, longitude);
            
            const plusCode = generatePlusCode(latitude, longitude);
            
            setPropertyData({
              ...generatedData,
              property_type: propertyType,
              listing_type: listingType,
              language: propertyLanguage,
              currency_id: selectedCurrency,
              latitude: latitude,
              longitude: longitude,
              plus_code: plusCode,
              show_map: true,
              custom_fields_data: generatedData.custom_fields_data || {},
            });
            
            setCustomFieldsValues(generatedData.custom_fields_data || {});
          },
          (error) => {
            console.log('GPS no disponible:', error);
            
            setPropertyData({
              ...generatedData,
              property_type: propertyType,
              listing_type: listingType,
              language: propertyLanguage,
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
        setPropertyData({
          ...generatedData,
          property_type: propertyType,
          listing_type: listingType,
          language: propertyLanguage,
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
          headers: {
            'X-Upload-Token': token,
          },
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
      headers: {
        'X-Upload-Token': token,
      },
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
    language: 'es' | 'en',
    fields: CustomField[]
  ): Promise<PropertyData> => {
    const response = await fetch('/api/property/generate', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Upload-Token': token,
      },
      body: JSON.stringify({ 
        transcription,
        property_type: propType,
        listing_type: listType,
        language: language,
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
    if (!propertyData || !agentId) return;

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
      const response = await fetch('/api/property/create', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Upload-Token': token,
        },
        body: JSON.stringify({
          ...propertyData,
          agent_id: agentId,
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
      
      let photoUrls: string[] = [];
      
      if (photos.length > 0) {
        console.log(`📤 Subiendo ${photos.length} fotos...`);
        photoUrls = await uploadPhotosWithSlug(photos, slug);
      }
      
      if (photoUrls.length > 0) {
        const updateResponse = await fetch(`/api/property/update/${propertyId}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'X-Upload-Token': token,
          },
          body: JSON.stringify({ 
            photos: photoUrls 
          }),
        });

        if (!updateResponse.ok) {
          console.error('⚠️ Error actualizando fotos, pero la propiedad fue creada');
        } else {
          console.log(`✅ Fotos actualizadas en la propiedad`);
        }
      }
      
      setPhotos([]);
      
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

  const getFieldName = (field: CustomField): string => {
    if (propertyLanguage === 'en' && field.field_name_en) {
      return field.field_name_en;
    }
    return field.field_name;
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

  const getPropertyTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      house: t('createProperty.house'),
      condo: t('createProperty.condo'),
      apartment: t('createProperty.apartment'),
      land: t('createProperty.land'),
      commercial: t('createProperty.commercial'),
    };
    return labels[type] || type;
  };

  const getListingTypeLabel = (type: string) => {
    return type === 'sale' ? t('createProperty.sale') : t('createProperty.rent');
  };

  return (
    <MobileLayout 
      title={`Subir para ${agentName}`} 
      showBack={true} 
      showTabs={false}
    >
      <div className="px-4 py-6">
        <div className="mb-6 bg-green-50 border-2 border-green-300 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">✅</span>
            <h3 className="font-bold text-green-900">
              Acceso Autorizado
            </h3>
          </div>
          <p className="text-sm text-green-800">
            Estás creando propiedades en nombre de <strong>{agentName}</strong>
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span>📸</span> {t('createProperty.step1')}
            </h2>
            <PhotoUploader 
              onPhotosChange={handlePhotosChange}
              minPhotos={2}
              maxPhotos={10}
              watermarkConfig={watermarkConfig}
            />
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span>🏷️</span> {t('createProperty.step2')}
            </h2>
            
            <div className="grid grid-cols-1 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('createProperty.propertyType')}
                </label>
                <select
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 font-semibold"
                >
                  <option value="house">{t('createProperty.house')}</option>
                  <option value="condo">{t('createProperty.condo')}</option>
                  <option value="apartment">{t('createProperty.apartment')}</option>
                  <option value="land">{t('createProperty.land')}</option>
                  <option value="commercial">{t('createProperty.commercial')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('createProperty.listingType')}
                </label>
                <select
                  value={listingType}
                  onChange={(e) => setListingType(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 font-semibold"
                >
                  <option value="sale">{t('createProperty.sale')}</option>
                  <option value="rent">{t('createProperty.rent')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  🌐 {t('createProperty.propertyLanguage')}
                  {propertyLanguage === language && (
                    <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-semibold">
                      Default
                    </span>
                  )}
                </label>
                <select
                  value={propertyLanguage}
                  onChange={(e) => setPropertyLanguage(e.target.value as 'es' | 'en')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 font-semibold"
                >
                  <option value="es">🇪🇸 {t('createProperty.spanish')}</option>
                  <option value="en">🇺🇸 {t('createProperty.english')}</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  💡 {t('createProperty.propertyLanguageTip')}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  💰 {t('createProperty.currency')}
                  {agentDefaultCurrency === selectedCurrency && (
                    <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-semibold">
                      {t('createProperty.defaultCurrency')}
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
                  💡 {t('createProperty.currencyTip')}
                </p>
              </div>
            </div>

            {loadingCustomFields ? (
              <div className="bg-gray-50 border-2 border-gray-200 rounded-2xl p-4 text-center">
                <div className="text-2xl mb-2 animate-pulse">⏳</div>
                <p className="text-sm text-gray-600">{t('common.loading')}...</p>
              </div>
            ) : customFields.length > 0 ? (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4">
                <div className="flex items-start gap-2 mb-3">
                  <span className="text-2xl">💡</span>
                  <div>
                    <h3 className="font-bold text-blue-900 mb-1">
                      {propertyLanguage === 'en' 
                        ? 'Fields to mention in your recording:'
                        : 'Campos a mencionar en tu grabación:'
                      }
                    </h3>
                    <p className="text-sm text-blue-700">
                      {propertyLanguage === 'en'
                        ? 'Mention these details so the AI fills them out automatically'
                        : 'Menciona estos detalles para que la IA los complete automáticamente'
                      }
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  {customFields.map(field => (
                    <div key={field.id} className="flex items-center gap-2 text-sm font-semibold text-blue-900">
                      <span className="text-lg">{field.icon}</span>
                      <span>{getFieldName(field)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : canUseSuggested ? (
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-300 rounded-2xl p-5">
                <div className="flex items-start gap-3 mb-4">
                  <span className="text-3xl">✨</span>
                  <div>
                    <h3 className="font-bold text-purple-900 mb-1">
                      {propertyLanguage === 'en'
                        ? 'No custom fields yet!'
                        : '¡Aún no tienes campos personalizados!'
                      }
                    </h3>
                    <p className="text-sm text-purple-700">
                      {propertyLanguage === 'en'
                        ? 'Load suggested fields to speed up your listing creation'
                        : 'Carga campos sugeridos para agilizar la creación de tu propiedad'
                      }
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={handleUseSuggestedFields}
                  disabled={loadingSuggested}
                  className="w-full py-3 rounded-xl font-bold text-white shadow-lg active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ backgroundColor: '#8B5CF6' }}
                >
                  {loadingSuggested ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      {propertyLanguage === 'en' ? 'Loading...' : 'Cargando...'}
                    </>
                  ) : (
                    <>
                      <span>🚀</span>
                      {propertyLanguage === 'en' ? 'Use Suggested Fields' : 'Usar Campos Sugeridos'}
                    </>
                  )}
                </button>
                
                <p className="text-xs text-purple-600 mt-3 text-center">
                  {propertyLanguage === 'en'
                    ? 'You can edit or delete them later in Settings'
                    : 'Podrás editarlos o eliminarlos después en Configuración'
                  }
                </p>
              </div>
            ) : (
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-4">
                <div className="flex items-start gap-2">
                  <span className="text-2xl">ℹ️</span>
                  <div>
                    <p className="text-sm text-yellow-800 font-semibold mb-1">
                      {t('createProperty.noCustomFields')}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span>📝</span> {t('createProperty.step3')}
            </h2>

            <VoiceRecorder 
              onRecordingComplete={handleRecordingComplete}
              minDuration={10}
              maxDuration={120}
              instructionLanguage={propertyLanguage}
            />
          </div>

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
                    {t('createProperty.generating')}
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    {t('createProperty.generateWithAI')}
                  </>
                )}
              </button>
            </div>
          )}

          {propertyData && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span>✅</span> {t('createProperty.step4')}
              </h2>
              
              <div className="space-y-4">
                <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">{t('createProperty.configuration')}:</p>
                      <p className="font-bold text-gray-900">
                        {getPropertyTypeLabel(propertyType)}
                        {' → '}
                        {getListingTypeLabel(listingType)}
                        {' → '}
                        {getSelectedCurrencySymbol()} {currencies.find(c => c.id === selectedCurrency)?.code}
                        {' → '}
                        {propertyLanguage === 'es' ? '🇪🇸 Español' : '🇺🇸 English'}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setPropertyData(null);
                        setCustomFieldsValues({});
                      }}
                      className="text-sm text-blue-600 underline font-semibold"
                    >
                      {t('createProperty.changeConfig')}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    ℹ️ {t('createProperty.changeConfigTip')}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('createProperty.title')}
                  </label>
                  <input
                    type="text"
                    value={propertyData.title}
                    onChange={(e) => setPropertyData({ ...propertyData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('createProperty.description')}
                  </label>
                  <textarea
                    value={propertyData.description}
                    onChange={(e) => setPropertyData({ ...propertyData, description: e.target.value })}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('createProperty.price')} ({getSelectedCurrencySymbol()})
                  </label>
                  <input
                    type="number"
                    value={propertyData.price || ''}
                    onChange={(e) => setPropertyData({ ...propertyData, price: Number(e.target.value) || null })}
                    placeholder={t('createProperty.optional')}
                    className="w-full px-3 py-2 border border-gray-300 text-gray-900 rounded-lg"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('createProperty.address')}
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
                      {t('createProperty.city')}
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
                      {t('createProperty.state')}
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
                      {t('createProperty.zipCode')}
                    </label>
                    <input
                      type="text"
                      value={propertyData.zip_code}
                      onChange={(e) => setPropertyData({ ...propertyData, zip_code: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 text-gray-900 rounded-lg"
                    />
                  </div>
                </div>

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
                        🗺️ {t('createProperty.showOnMap')}
                      </span>
                    </label>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-semibold mb-2 text-gray-700">
                      🌎 {t('createProperty.propertyCountry')}
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
                        ? `📍 ${t('createProperty.countryDetected')}`
                        : t('createProperty.selectCountry')}
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

                {customFields.length > 0 && (
                  <div className="pt-4 border-t border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <span>🏷️</span>
                      {t('createProperty.customFields')}
                    </h3>

                    <div className="space-y-3">
                      {customFields.map((field) => (
                        <div key={field.id}>
                          <label className="block text-sm font-semibold mb-2 flex items-center gap-2 text-gray-700">
                            <span className="text-lg">{field.icon || '🏷️'}</span>
                            {getFieldName(field)}
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

                    {emptyCustomFields.length > 0 && (
                      <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <span className="text-xl">⚠️</span>
                          <div>
                            <p className="text-sm font-semibold text-yellow-800 mb-1">
                              {t('createProperty.emptyFieldsWarning')}:
                            </p>
                            <ul className="text-xs text-yellow-700 space-y-1">
                              {emptyCustomFields.map(field => (
                                <li key={field.id}>• {field.icon} {getFieldName(field)}</li>
                              ))}
                            </ul>
                            <p className="text-xs text-yellow-600 mt-2">
                              {t('createProperty.emptyFieldsTip')}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-4 pt-4">
                  <button
                    onClick={() => {
                      setPropertyData(null);
                      setCustomFieldsValues({});
                    }}
                    className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50"
                  >
                    {t('createProperty.cancel')}
                  </button>
                  <button
                    onClick={handlePublish}
                    disabled={isProcessing}
                    className="flex-1 px-6 py-3 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 disabled:opacity-50"
                  >
                    {isProcessing ? t('createProperty.publishing') : `🚀 ${t('createProperty.publishProperty')}`}
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
