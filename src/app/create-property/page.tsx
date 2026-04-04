'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import PhotoUploader from '@/components/property/PhotoUploader';
import VoiceRecorder from '@/components/property/VoiceRecorder';
import GoogleMapEditor from '@/components/property/GoogleMapEditor';
import VideoUploader from '@/components/property/VideoUploader';
import PublishingModal from '@/components/property/PublishingModal';
import { uploadVideoToMux, waitForPlaybackId } from '@/lib/muxUpload';
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

export default function CreatePropertyPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t } = useTranslation();
  const { language } = useI18nStore();

  // Step 1: Photos
  const [photos, setPhotos] = useState<File[]>([]);
  const [tempPhotoUrls, setTempPhotoUrls] = useState<string[]>([]);
  const [watermarkConfig, setWatermarkConfig] = useState<any>(null);
  
  // Videos
  const [videos, setVideos] = useState<File[]>([]);
  const [videoProgress, setVideoProgress] = useState<string>('');

  // Estados del modal de publicación
  const [publishingModalOpen, setPublishingModalOpen] = useState(false);
  const [publishingSteps, setPublishingSteps] = useState<{
    id: number;
    label: string;
    status: 'pending' | 'active' | 'completed' | 'error';
  }[]>([]);

  // Step 2: Property Configuration
  const [propertyType, setPropertyType] = useState<string>('house');
  const [listingType, setListingType] = useState<string>('sale');
  const [propertyLanguage, setPropertyLanguage] = useState<'es' | 'en'>(language);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [loadingCustomFields, setLoadingCustomFields] = useState(false);

  const [canUseSuggested, setCanUseSuggested] = useState(false);
  const [loadingSuggested, setLoadingSuggested] = useState(false);

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

  /* Facebook */
  // Facebook import states
  const [showImportModal, setShowImportModal] = useState(false);
  const [facebookPosts, setFacebookPosts] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [importingPost, setImportingPost] = useState(false);

  const [activeTab, setActiveTab] = useState<'voice' | 'facebook'>('voice');
  const [visiblePostsCount, setVisiblePostsCount] = useState(5);
  const lazyLoadRef = useRef<HTMLDivElement>(null);
  
  // Solo tab de voz activo por ahora
  //const [activeTab] = useState<'voice'>('voice');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Sincronizar propertyLanguage con el idioma de la interfaz
  useEffect(() => {
    setPropertyLanguage(language);
  }, [language]);

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

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisiblePostsCount(prev => Math.min(prev + 5, facebookPosts.length));
        }
      },
      { threshold: 0.1 }
    );
    if (lazyLoadRef.current) observer.observe(lazyLoadRef.current);
    return () => observer.disconnect();
  }, [facebookPosts.length]);

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
          // Logo en esquina
          useCornerLogo: data.agent.use_corner_logo ?? true,
          cornerLogoUrl: data.agent.watermark_logo || null,
          position: data.agent.watermark_position || 'bottom-right',
          size: data.agent.watermark_size || 'medium',
          
          // Watermark centrado
          useWatermark: data.agent.use_watermark ?? false,
          watermarkUrl: data.agent.watermark_image || null,
          opacity: data.agent.watermark_opacity || 30,
          scale: data.agent.watermark_scale || 50,
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

  const generatePlusCode = (lat: number, lng: number): string => {
    // Open Location Code algorithm (algoritmo oficial de Google)
    const CODE_ALPHABET = '23456789CFGHJMPQRVWX';
    const PAIR_CODE_LENGTH = 10;
    
    // Normalizar coordenadas
    let latitude = lat;
    let longitude = lng;
    
    // Ajustar si están fuera de rango
    latitude = Math.max(-90, Math.min(90, latitude));
    longitude = ((longitude % 360) + 360) % 360;
    if (longitude > 180) longitude -= 360;
    
    // Normalizar a valores positivos (0-180 para lat, 0-360 para lng)
    latitude += 90;
    longitude += 180;
    
    let code = '';
    let latPlaceValue = 400; // 20^2 (para lat inicial)
    let lngPlaceValue = 400; // 20^2 (para lng inicial)
    
    // Generar los primeros 10 dígitos (5 pares)
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
    
    // Formato estándar: XXXX+XX (primeros 4 + separador + siguientes 2)
    const formattedCode = code.substring(0, 4) + '+' + code.substring(4, 6);
    console.log('✅ Plus Code generado localmente:', formattedCode);
    return formattedCode;
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
        setCanUseSuggested(false);
        return;
      }
      
      const data = await response.json();
      const fields = data.fields || [];
      setCustomFields(fields);
      
      //Determinar si se puede mostrar el botón de campos sugeridos
      setCanUseSuggested(fields.length === 0);
    } catch (err) {
      console.error('Error loading custom fields:', err);
      setCustomFields([]);
      setCanUseSuggested(false); // NUEVO
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
      
      // Recargar campos para mostrarlos
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

  if (status === 'loading') {
    return (
      <MobileLayout title={t('createProperty.title')} showBack={true} showTabs={true}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center py-12">
            <div className="text-5xl mb-4 animate-pulse">🏠</div>
            <div className="text-lg" style={{ color: '#0F172A' }}>{t('common.loading')}</div>
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

      // 2. Generar descripción con la IA
      const generatedData = await generateDescription(
        transcription, 
        propertyType, 
        listingType,
        propertyLanguage,
        customFields
      );

      // 3. Actualizar estado con datos generados (SIN GPS)
      // Dejamos las coordenadas en null para que el componente del mapa 
      // haga el geocoding basado en la dirección que acaba de inventar la IA.
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

    } catch (err) {
      console.error('Error al procesar:', err);
      setError(err instanceof Error ? err.message : 'Error al procesar la propiedad');
    } finally {
      setIsProcessing(false);
    }
  };

  const uploadPhotosWithSlug = async (files: File[], slug: string): Promise<string[]> => {
    const batchSize = 1;
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
    language: 'es' | 'en',
    fields: CustomField[]
  ): Promise<PropertyData> => {
    const response = await fetch('/api/property/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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

  const initPublishingSteps = (hasVideos: boolean) => {
    const steps = [
      { id: 1, label: language === 'en' ? 'Creating property...' : 'Creando propiedad...', status: 'pending' as const },
      { id: 2, label: language === 'en' ? 'Uploading photos...' : 'Subiendo fotos...', status: 'pending' as const },
    ];

    if (hasVideos) {
      steps.push({ id: 3, label: language === 'en' ? 'Uploading videos...' : 'Subiendo videos...', status: 'pending' as const });
      steps.push({ id: 4, label: language === 'en' ? 'Processing videos...' : 'Procesando videos...', status: 'pending' as const });
    }

    steps.push({ id: hasVideos ? 5 : 3, label: language === 'en' ? 'Finishing up...' : 'Finalizando...', status: 'pending' as const });

    return steps;
  };

  const updateStep = (stepId: number, status: 'pending' | 'active' | 'completed' | 'error', newLabel?: string) => {
    setPublishingSteps(prev => prev.map(step =>
      step.id === stepId ? { ...step, status, label: newLabel || step.label } : step
    ));
  };

  const handlePublish = async () => {
    if (!propertyData) return;

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

    const hasVideos = videos.length > 0;
    const steps = initPublishingSteps(hasVideos);
    setPublishingSteps(steps);
    setPublishingModalOpen(true);
    setIsProcessing(true);
    setError(null);
    setVideoProgress('');

    try {
      // Paso 1: Crear propiedad
      updateStep(1, 'active');
      const response = await fetch('/api/property/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...propertyData,
          photos: [],
          video_urls: [],
          mux_upload_ids: [],
          video_processing: hasVideos,
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
      updateStep(1, 'completed', language === 'en' ? '✓ Property created' : '✓ Propiedad creada');

      // Paso 2: Subir fotos
      updateStep(2, 'active');
      let photoUrls: string[] = [];

      if (activeTab === 'facebook' && tempPhotoUrls.length > 0) {
        console.log('📸 Usando fotos importadas de Facebook');
        photoUrls = tempPhotoUrls;
      } else if (photos.length > 0) {
        console.log(`📤 Subiendo ${photos.length} fotos nuevas...`);
        photoUrls = await uploadPhotosWithSlug(photos, slug);
      }
      updateStep(2, 'completed', language === 'en' ? `✓ Photos uploaded (${photoUrls.length})` : `✓ Fotos subidas (${photoUrls.length})`);

      // Paso 3 y 4: Videos (si hay)
      let videoUrls: string[] | null = null;

      if (hasVideos) {
        try {
          const uploadIds: string[] = [];
          const playbackIds: string[] = [];

          for (let i = 0; i < videos.length; i++) {
            updateStep(3, 'active', language === 'en'
              ? `Uploading video ${i + 1} of ${videos.length}...`
              : `Subiendo video ${i + 1} de ${videos.length}...`
            );

            const uploadId = await uploadVideoToMux(videos[i], (progress) => {
              console.log(`Video ${i + 1} progress:`, progress);
            });

            uploadIds.push(uploadId);
            await fetch(`/api/property/update/${propertyId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ mux_upload_ids: uploadIds }),
            });
          }

          updateStep(3, 'completed', language === 'en' ? `✓ Videos uploaded (${videos.length})` : `✓ Videos subidos (${videos.length})`);
          updateStep(4, 'active');

          for (let i = 0; i < uploadIds.length; i++) {
            updateStep(4, 'active', language === 'en'
              ? `Processing video ${i + 1} of ${uploadIds.length}...`
              : `Procesando video ${i + 1} de ${uploadIds.length}...`
            );
            const playbackId = await waitForPlaybackId(uploadIds[i]);
            playbackIds.push(playbackId);
          }

          videoUrls = playbackIds.map(id => `https://stream.mux.com/${id}/capped-1080p.mp4`);
          updateStep(4, 'completed', language === 'en' ? '✓ Videos processed' : '✓ Videos procesados');

        } catch (videoError: any) {
          updateStep(3, 'error');
          updateStep(4, 'error');
          console.error('Error procesando videos:', videoError);

          const errorMessage = language === 'en'
            ? `⚠️ Video processing failed: ${videoError.message || 'Unknown error'}.\n\nYour property was created successfully. You can edit it later to add videos when you have a better connection.`
            : `⚠️ El procesamiento de video falló: ${videoError.message || 'Error desconocido'}.\n\nTu propiedad fue creada exitosamente. Puedes editarla después para agregar videos cuando tengas mejor señal.`;

          alert(errorMessage);
        }
      }

      // Último paso: Finalizar
      const lastStep = hasVideos ? 5 : 3;
      updateStep(lastStep, 'active');

      const updateResponse = await fetch(`/api/property/update/${propertyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photos: photoUrls,
          video_urls: videoUrls,
          video_processing: false,
        }),
      });

      if (!updateResponse.ok) {
        console.error('⚠️ Error actualizando fotos/video, pero la propiedad fue creada');
      } else {
        console.log(`✅ Fotos y video actualizados en la propiedad`);
      }

      updateStep(lastStep, 'completed', language === 'en' ? '✓ All done!' : '✓ ¡Todo listo!');

      await new Promise(resolve => setTimeout(resolve, 1000));

      setTempPhotoUrls([]);
      setPhotos([]);
      setVideos([]);
      setPublishingModalOpen(false);
      router.push(`/p/${slug}`);

    } catch (err) {
      console.error('Error al publicar:', err);
      setError(err instanceof Error ? err.message : 'Error al publicar');
      setPublishingModalOpen(false);
    } finally {
      setIsProcessing(false);
      setVideoProgress('');
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

  // Usar idioma de la PROPIEDAD, no de la interfaz
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
      hotel: t('createProperty.hotel'),
      finca: t('createProperty.finca'),
      ranch: t('createProperty.ranch'),
      other: t('createProperty.other'),
    };
    return labels[type] || type;
  };

  const getListingTypeLabel = (type: string) => {
    return type === 'sale' ? t('createProperty.sale') : t('createProperty.rent');
  };

  /* Facebook */
  const loadFacebookPosts = async () => {
    setLoadingPosts(true);
    setError(null);
    
    try {
      const response = await fetch('/api/facebook/list-posts');
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al cargar posts');
      }
      
      const data = await response.json();
      setFacebookPosts(data.posts || []);
      
      if (data.posts.length === 0) {
        setError('No se encontraron posts en tu página de Facebook');
      }
    } catch (err: any) {
      console.error('Error cargando posts:', err);
      setError(err.message || 'Error al cargar posts de Facebook');
    } finally {
      setLoadingPosts(false);
    }
  };

  const handleImportPost = async (post: any) => {
    if (!propertyType || !listingType) {
      setError('Primero selecciona el tipo de propiedad y tipo de operación');
      return;
    }

    // Verificar duplicado
    try {
      const checkResp = await fetch(`/api/facebook/check-import?postId=${post.id}`);
      const { alreadyImported } = await checkResp.json();
      if (alreadyImported) {
        const proceed = confirm(
          propertyLanguage === 'en'
            ? '⚠️ This post was already imported as a property. Do you want to import it again?'
            : '⚠️ Este post ya fue importado como propiedad anteriormente. ¿Deseas importarlo de nuevo?'
        );
        if (!proceed) return;
      }
    } catch (err) {
      console.warn('No se pudo verificar duplicado:', err);
    }

    // resto del código sin cambios
    setImportingPost(true);
    setShowImportModal(true);
    setError(null);
    setSelectedPost(post);
    
    try {
      const response = await fetch('/api/facebook/import-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: post.id,
          property_type: propertyType,
          listing_type: listingType,
          language: propertyLanguage,
          custom_fields: customFields,
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al importar post');
      }
      
      const data = await response.json();
      
      console.log('✅ Post importado:', data);
      
      // Setear las fotos importadas
      const importedPhotos = data.property.photos || [];
      setTempPhotoUrls(importedPhotos);
      
      // Pre-llenar datos de la propiedad con geolocalización
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            
            await detectCountryFromLocation(latitude, longitude);
            
            const plusCode = generatePlusCode(latitude, longitude);
            
            setPropertyData({
              ...data.property,
              property_type: propertyType,
              listing_type: listingType,
              language: propertyLanguage,
              currency_id: selectedCurrency,
              latitude: latitude,
              longitude: longitude,
              plus_code: plusCode,
              show_map: true,
              photos: importedPhotos,
            });
            
            setCustomFieldsValues(data.property.custom_fields_data || {});
          },
          (error) => {
            console.log('GPS no disponible:', error);
            
            setPropertyData({
              ...data.property,
              property_type: propertyType,
              listing_type: listingType,
              language: propertyLanguage,
              currency_id: selectedCurrency,
              latitude: null,
              longitude: null,
              plus_code: null,
              show_map: true,
              photos: importedPhotos,
            });
            
            setCustomFieldsValues(data.property.custom_fields_data || {});
          }
        );
      } else {
        setPropertyData({
          ...data.property,
          property_type: propertyType,
          listing_type: listingType,
          language: propertyLanguage,
          currency_id: selectedCurrency,
          latitude: null,
          longitude: null,
          plus_code: null,
          show_map: true,
          photos: importedPhotos,
        });
        
        setCustomFieldsValues(data.property.custom_fields_data || {});
      }
      
      // Scroll al preview
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      
    } catch (err: any) {
      console.error('Error importando post:', err);
      setError(err.message || 'Error al importar post de Facebook');
    } finally {
      setImportingPost(false);
      setShowImportModal(false);
    }
  };

  return (
    <MobileLayout title={t('createProperty.createTitle')} showBack={true} showTabs={true}>
      <div className="px-4 py-6">
        <div className="mb-6 text-center">
          <p className="text-lg font-semibold" style={{ color: '#0F172A' }}>
            {t('createProperty.introText')}
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
          {/* Section 1: Photos and Videos */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span>📸</span> {language === 'en' ? 'Photos and Videos' : 'Fotos y Videos'}
            </h2>
            
            <PhotoUploader 
              onPhotosChange={handlePhotosChange}
              minPhotos={2}
              maxPhotos={15}
              watermarkConfig={watermarkConfig}
            />
            
            {/* Videos - NUEVO */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <VideoUploader
                onVideosChange={(files) => setVideos(files)}
                maxVideos={4}
                maxDurationSeconds={60}
              />
              <p className="text-xs text-gray-500 mt-2">
                💡 {language === 'en' 
                  ? 'Max 60 seconds total · Plays as a continuous playlist'
                  : 'Máx 60 segundos en total · Se reproducen como playlist continua'
                }
              </p>
            </div>
          </div>

          {/* Section 2: Property Configuration */}
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
                  <option value="hotel">{t('createProperty.hotel')}</option>
                  <option value="finca">{t('createProperty.finca')}</option>
                  <option value="quinta">{t('createProperty.quinta')}</option>
                  <option value="other">{t('createProperty.other')}</option>
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

              {/* Selector de idioma de la propiedad */}
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

              {/* NUEVO: Selector de Divisa */}
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

            {/* Hint de Campos Personalizados */}
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
                    <button
                      onClick={() => router.push('/settings/custom-fields')}
                      className="text-sm text-blue-600 underline font-semibold"
                    >
                      {t('createProperty.createCustomFields')}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Voice Recording / Facebook Import */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span>📝</span> {t('createProperty.step3')}
            </h2>

            {/* Tabs Voz / Facebook */}
            <div className="flex rounded-xl overflow-hidden border-2 border-gray-200 mb-5">
              <button
                onClick={() => setActiveTab('voice')}
                className={`flex-1 py-3 text-sm font-bold transition-colors flex items-center justify-center gap-2 ${
                  activeTab === 'voice'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                🎙️ {propertyLanguage === 'en' ? 'Voice' : 'Voz'}
              </button>
              <button
                onClick={() => {
                  setActiveTab('facebook');
                  if (facebookPosts.length === 0 && !loadingPosts) loadFacebookPosts();
                }}
                className={`flex-1 py-3 text-sm font-bold transition-colors flex items-center justify-center gap-2 ${
                  activeTab === 'facebook'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                📘 Facebook
              </button>
            </div>

            {/* Contenido tab Voz */}
            {activeTab === 'voice' && (
              <VoiceRecorder 
                onRecordingComplete={handleRecordingComplete}
                minDuration={10}
                maxDuration={120}
                instructionLanguage={propertyLanguage}
              />
            )}

            {/* Contenido tab Facebook */}
            {activeTab === 'facebook' && (
              <div className="space-y-4">
                {/* Loading */}
                {loadingPosts && (
                  <div className="text-center py-10">
                    <div className="text-5xl mb-3 animate-pulse">📘</div>
                    <p className="text-sm text-gray-500">
                      {propertyLanguage === 'en'
                        ? 'Loading your Facebook posts...'
                        : 'Cargando tus publicaciones de Facebook...'}
                    </p>
                  </div>
                )}

                {/* Sin posts */}
                {!loadingPosts && facebookPosts.length === 0 && (
                  <div className="text-center py-10 px-4">
                    <div className="text-5xl mb-3">😕</div>
                    <p className="font-semibold text-gray-700 mb-1">
                      {propertyLanguage === 'en'
                        ? 'No posts found'
                        : 'No se encontraron publicaciones'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {propertyLanguage === 'en'
                        ? 'Make sure your Facebook page is connected and has posts.'
                        : 'Asegúrate de que tu página de Facebook está conectada y tiene publicaciones.'}
                    </p>
                    <button
                      onClick={loadFacebookPosts}
                      className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg"
                    >
                      🔄 {propertyLanguage === 'en' ? 'Retry' : 'Reintentar'}
                    </button>
                  </div>
                )}

                {/* Lista de posts con lazy load */}
                {!loadingPosts && facebookPosts.length > 0 && (
                  <>
                    <p className="text-xs text-gray-400 text-center mb-2">
                      {propertyLanguage === 'en'
                        ? `${facebookPosts.length} posts found`
                        : `${facebookPosts.length} publicaciones encontradas`}
                    </p>

                    {/* Contenedor con scroll interno */}
                    <div
                      className="overflow-y-auto space-y-4 pr-1"
                      style={{ maxHeight: '60vh' }}
                    >
                      {facebookPosts.slice(0, visiblePostsCount).map((post) => (
                        <div
                          key={post.id}
                          className="border-2 border-gray-200 rounded-xl overflow-hidden bg-gray-50"
                        >
                          {post.thumbnail && (
                            <div className="relative w-full h-40 bg-gray-200">
                              <img
                                src={post.thumbnail}
                                alt="Post"
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                              {post.image_count > 1 && (
                                <div className="absolute top-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded-full font-bold">
                                  📸 {post.image_count}
                                </div>
                              )}
                            </div>
                          )}

                          <div className="p-3">
                            <p className="text-xs text-gray-400 mb-2">{post.created_time}</p>

                            {post.message && (
                              <p className="text-sm text-gray-700 line-clamp-3 mb-3">
                                {post.message}
                              </p>
                            )}

                            {!post.has_images && (
                              <div className="mb-3 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <p className="text-xs text-yellow-700 font-semibold">
                                  ⚠️ {propertyLanguage === 'en'
                                    ? 'This post has no images'
                                    : 'Esta publicación no tiene imágenes'}
                                </p>
                              </div>
                            )}
                            
                            {post.already_imported && (
                              <div className="mb-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
                                <p className="text-xs text-green-700 font-semibold">
                                  ✅ {propertyLanguage === 'en'
                                    ? 'Already imported — you can import again if needed'
                                    : 'Ya importado — puedes volver a importar si lo necesitas'}
                                </p>
                              </div>
                            )}

                            <button
                              onClick={() => handleImportPost(post)}
                              disabled={!post.has_images || importingPost}
                              className="w-full py-2.5 rounded-xl font-bold text-white text-sm transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                              style={{ backgroundColor: post.has_images ? '#1877F2' : '#9CA3AF' }}
                            >
                              {importingPost && selectedPost?.id === post.id ? (
                                <>
                                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                  </svg>
                                  {propertyLanguage === 'en' ? 'Importing...' : 'Importando...'}
                                </>
                              ) : (
                                <>
                                  <span>📥</span>
                                  {propertyLanguage === 'en' ? 'Import property' : 'Importar propiedad'}
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Lazy load trigger — dentro del scroll */}
                      {visiblePostsCount < facebookPosts.length && (
                        <div
                          ref={lazyLoadRef}
                          className="text-center py-4 text-sm text-gray-400 animate-pulse"
                        >
                          {propertyLanguage === 'en' ? 'Loading more...' : 'Cargando más...'}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
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

          {/* Section 4: Generated Preview */}
          {propertyData && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span>✅</span> {t('createProperty.step4')}
              </h2>
              
              <div className="space-y-4">
                {/* Property Type, Listing Type, Currency (NO EDITABLE) */}
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

                {/* Title */}
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

                {/* Description */}
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

                {/* Price con símbolo de divisa */}
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

                {/* Location */}
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
                        🗺️ {t('createProperty.showOnMap')}
                      </span>
                    </label>
                  </div>

                  {/* Dropdown de País */}
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

                {/* Preview de fotos importadas */}
                {tempPhotoUrls.length > 0 && (
                  <div className="pt-4 border-t border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      📸 {t('createProperty.importedPhotos')} ({tempPhotoUrls.length})
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                      {tempPhotoUrls.map((url, index) => (
                        <div key={index} className="relative aspect-square rounded-lg overflow-hidden">
                          <img 
                            src={url} 
                            alt={`Imported ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          {index === 0 && (
                            <div className="absolute bottom-1 left-1 px-2 py-0.5 rounded text-xs font-bold text-white bg-blue-500">
                              Principal
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* CUSTOM FIELDS */}
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

                    {/* Warning si hay campos vacíos */}
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

                {/* Indicador de progreso de video */}
                {isProcessing && videoProgress && (
                  <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <p className="text-sm font-semibold text-purple-900">
                      🎬 {videoProgress}
                    </p>
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
      
      {showImportModal && (
        <>
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-50"
            style={{ backdropFilter: 'blur(4px)' }}
          />
          
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-sm w-full">
              <div className="text-center">
                <div className="text-6xl mb-4 animate-bounce">📲</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {propertyLanguage === 'en' ? 'Importing Post...' : 'Importando Publicación...'}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  {propertyLanguage === 'en' 
                    ? 'Downloading images and extracting data with AI...' 
                    : 'Descargando imágenes y extrayendo datos con IA...'}
                </p>
                <div className="flex justify-center">
                  <svg className="animate-spin h-8 w-8 text-blue-600" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal de publicación */}
      <PublishingModal
        isOpen={publishingModalOpen}
        steps={publishingSteps}
        hasVideos={videos.length > 0}
        language={language}
      />
    </MobileLayout>
  );
}