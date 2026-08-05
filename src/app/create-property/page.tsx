'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { trackEvent } from '@/lib/fbpixel';
import PhotoUploader from '@/components/property/PhotoUploader';
import VoiceRecorder from '@/components/property/VoiceRecorder';
import GoogleMapEditor from '@/components/property/GoogleMapEditor';
import VideoUploader from '@/components/property/VideoUploader';
import PublishingModal from '@/components/property/PublishingModal';
import { uploadVideoToMux, waitForPlaybackId } from '@/lib/muxUpload';
import AppLayout from '@/components/AppLayout';
import { useTranslation } from '@/hooks/useTranslation';
import { useI18nStore } from '@/lib/i18n-store';
import { createClient } from '@supabase/supabase-js';
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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function CreatePropertyPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t } = useTranslation();
  const { language } = useI18nStore();

  const [agentId, setAgentId] = useState<string | null>(null);

  // Photos & Videos
  const [photos, setPhotos] = useState<File[]>([]);
  const [tempPhotoUrls, setTempPhotoUrls] = useState<string[]>([]);
  const [videos, setVideos] = useState<File[]>([]);
  const [videoProgress, setVideoProgress] = useState<string>('');

  // Publishing modal
  const [publishingModalOpen, setPublishingModalOpen] = useState(false);
  const [publishingSteps, setPublishingSteps] = useState<{
    id: number;
    label: string;
    status: 'pending' | 'active' | 'completed' | 'error';
  }[]>([]);

  // Property config
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

  // Voice & generated data
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [propertyData, setPropertyData] = useState<PropertyData | null>(null);
  const [customFieldsValues, setCustomFieldsValues] = useState<Record<string, string>>({});

  // UI
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>('CR');

  // Facebook (disabled, kept for future)
  const [showImportModal, setShowImportModal] = useState(false);
  const [facebookPosts, setFacebookPosts] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [importingPost, setImportingPost] = useState(false);
  const activeTab = 'voice';
  const [visiblePostsCount, setVisiblePostsCount] = useState(5);
  const lazyLoadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  useEffect(() => {
    setPropertyLanguage(language);
  }, [language]);

  useEffect(() => {
    if (session) {
      loadCurrencies();
      loadAgentDefaultCurrency();
      loadAgentProfile();
    }
  }, [session]);

  useEffect(() => {
    if (propertyType && listingType) loadCustomFields(propertyType, listingType);
  }, [propertyType, listingType]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) setVisiblePostsCount(prev => Math.min(prev + 5, facebookPosts.length)); },
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
        if (data.defaultCurrency && !selectedCurrency) setSelectedCurrency(data.defaultCurrency.id);
      }
    } catch (err) { console.error('Error al cargar divisas:', err); }
  };

  const loadAgentDefaultCurrency = async () => {
    try {
      const response = await fetch('/api/agent/profile');
      if (response.ok) {
        const data = await response.json();
        if (data.agent.default_currency_id) {
          setAgentDefaultCurrency(data.agent.default_currency_id);
          setSelectedCurrency(data.agent.default_currency_id);
        }
      }
    } catch (err) { console.error('Error al cargar divisa del agente:', err); }
  };

  const loadAgentProfile = async () => {
    try {
      const response = await fetch('/api/agent/profile');
      if (response.ok) { const data = await response.json(); setAgentId(data.agent.id); }
    } catch (err) { console.error('Error al cargar perfil del agente:', err); }
  };

  const detectCountryFromLocation = async (lat: number, lng: number) => {
    for (const country of SUPPORTED_COUNTRIES) {
      const { bounds } = country;
      if (lat >= bounds.south && lat <= bounds.north && lng >= bounds.west && lng <= bounds.east) {
        setSelectedCountry(country.code);
        return country.code;
      }
    }
    return 'CR';
  };

  const generatePlusCode = (lat: number, lng: number): string => {
    const CODE_ALPHABET = '23456789CFGHJMPQRVWX';
    const PAIR_CODE_LENGTH = 10;
    let latitude = Math.max(-90, Math.min(90, lat)) + 90;
    let longitude = (((lng % 360) + 360) % 360);
    if (longitude > 180) longitude -= 360;
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
    return code.substring(0, 4) + '+' + code.substring(4, 6);
  };

  const loadCustomFields = async (propType: string, listType: string) => {
    try {
      setLoadingCustomFields(true);
      const response = await fetch(`/api/custom-fields/list?property_type=${propType}&listing_type=${listType}`);
      if (!response.ok) { setCustomFields([]); setCanUseSuggested(false); return; }
      const data = await response.json();
      const fields = data.fields || [];
      setCustomFields(fields);
      setCanUseSuggested(fields.length === 0);
    } catch (err) { setCustomFields([]); setCanUseSuggested(false); } finally { setLoadingCustomFields(false); }
  };

  const handleUseSuggestedFields = async () => {
    setLoadingSuggested(true);
    try {
      const response = await fetch('/api/custom-fields/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ property_type: propertyType, listing_type: listingType, language: propertyLanguage }),
      });
      if (!response.ok) { const data = await response.json(); throw new Error(data.error || 'Error al cargar campos sugeridos'); }
      await loadCustomFields(propertyType, listingType);
    } catch (error) {
      alert(propertyLanguage === 'en' ? 'Error loading suggested fields' : 'Error al cargar campos sugeridos');
    } finally { setLoadingSuggested(false); }
  };

  if (status === 'loading') {
    return (
      <AppLayout title={t('createProperty.title')} showBack={true} showTabs={true}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center py-12">
            <div className="text-5xl mb-4 animate-pulse">🏠</div>
            <div className="text-lg" style={{ color: '#0F172A' }}>{t('common.loading')}</div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!session) return null;

  const handlePhotosChange = (files: File[]) => setPhotos(files);
  const handleRecordingComplete = (blob: Blob) => setAudioBlob(blob);

  const handleGenerate = async () => {
    if (photos.length < 2) { setError('Necesitas al menos 2 fotos'); return; }
    if (!audioBlob) { setError('Necesitas grabar la descripción por voz'); return; }
    setIsProcessing(true);
    setError(null);
    try {
      const transcription = await transcribeAudio(audioBlob);
      const generatedData = await generateDescription(transcription, propertyType, listingType, propertyLanguage, customFields);
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
      setError(err instanceof Error ? err.message : 'Error al procesar la propiedad');
    } finally { setIsProcessing(false); }
  };

  const uploadPhotosDirectly = async (files: File[], slug: string, agent_id: string): Promise<string[]> => {
    const allUrls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileExt = file.name.split('.').pop() || 'jpg';
      const timestamp = Date.now();
      const baseFileName = `foto-${timestamp}-${i}`;
      const tempFilePath = `${agent_id}/${slug}/${baseFileName}.${fileExt}`;
      const finalFilePath = `${agent_id}/${slug}/${baseFileName}.jpg`;
      const { data, error } = await supabase.storage.from('temp-originals').upload(tempFilePath, file, { cacheControl: '3600', upsert: false });
      if (error) throw new Error(`Error al subir la foto ${i + 1}`);
      const { data: publicUrlData } = supabase.storage.from('property-photos').getPublicUrl(finalFilePath);
      allUrls.push(publicUrlData.publicUrl);
    }
    return allUrls;
  };

  const transcribeAudio = async (blob: Blob): Promise<string> => {
    const formData = new FormData();
    formData.append('audio', blob, 'recording.webm');
    const response = await fetch('/api/audio/transcribe', { method: 'POST', body: formData });
    if (!response.ok) throw new Error('Error al transcribir el audio');
    const data = await response.json();
    return data.transcription;
  };

  const generateDescription = async (transcription: string, propType: string, listType: string, lang: 'es' | 'en', fields: CustomField[]): Promise<PropertyData> => {
    const response = await fetch('/api/property/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcription, property_type: propType, listing_type: listType, language: lang, custom_fields: fields }),
    });
    if (!response.ok) throw new Error('Error al generar la descripción');
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
    setPublishingSteps(prev => prev.map(step => step.id === stepId ? { ...step, status, label: newLabel || step.label } : step));
  };

  const handlePublish = async () => {
    if (!propertyData) return;
    if (propertyData.show_map) {
      if (!propertyData.latitude || !propertyData.longitude) { setError('Debes configurar la ubicación en el mapa'); return; }
      if (!propertyData.plus_code) { setError('El Plus Code no se generó correctamente'); return; }
    }
    const hasVideos = videos.length > 0;
    const steps = initPublishingSteps(hasVideos);
    setPublishingSteps(steps);
    setPublishingModalOpen(true);
    setIsProcessing(true);
    setError(null);
    setVideoProgress('');
    try {
      updateStep(1, 'active');
      const response = await fetch('/api/property/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...propertyData, photos: [], video_urls: [], mux_upload_ids: [], video_processing: hasVideos, custom_fields_data: { ...propertyData.custom_fields_data, ...customFieldsValues } }),
      });
      if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.error || 'Error al crear la propiedad'); }
      const { propertyId, slug } = await response.json();
      updateStep(1, 'completed', language === 'en' ? '✓ Property created' : '✓ Propiedad creada');

      updateStep(2, 'active');
      let photoUrls: string[] = [];
      if (activeTab === 'facebook' && tempPhotoUrls.length > 0) {
        photoUrls = tempPhotoUrls;
      } else if (photos.length > 0) {
        if (!agentId) throw new Error("No se pudo obtener el ID del agente para la subida");
        photoUrls = await uploadPhotosDirectly(photos, slug, agentId);
      }
      updateStep(2, 'completed', language === 'en' ? `✓ Photos uploaded (${photoUrls.length})` : `✓ Fotos subidas (${photoUrls.length})`);

      let videoUrls: string[] | null = null;
      let muxAssetIds: string[] = [];
      let updateResponse: Response;

      if (hasVideos) {
        try {
          const uploadIds: string[] = [];
          const playbackIds: string[] = [];
          for (let i = 0; i < videos.length; i++) {
            updateStep(3, 'active', language === 'en' ? `Uploading video ${i + 1} of ${videos.length}...` : `Subiendo video ${i + 1} de ${videos.length}...`);
            const uploadId = await uploadVideoToMux(videos[i], (progress) => { console.log(`Video ${i + 1} progress:`, progress); });
            uploadIds.push(uploadId);
            await fetch(`/api/property/update/${propertyId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mux_upload_ids: uploadIds }) });
          }
          updateStep(3, 'completed', language === 'en' ? `✓ Videos uploaded (${videos.length})` : `✓ Videos subidos (${videos.length})`);
          updateStep(4, 'active');
          for (let i = 0; i < uploadIds.length; i++) {
            updateStep(4, 'active', language === 'en' ? `Processing video ${i + 1} of ${uploadIds.length}...` : `Procesando video ${i + 1} de ${uploadIds.length}...`);
            const { playbackId, assetId } = await waitForPlaybackId(uploadIds[i]);
            playbackIds.push(playbackId);
            muxAssetIds.push(assetId);
          }
          videoUrls = playbackIds.map(id => `https://stream.mux.com/${id}/capped-1080p.mp4`);
          updateStep(4, 'completed', language === 'en' ? '✓ Videos processed' : '✓ Videos procesados');
        } catch (videoError: any) {
          updateStep(3, 'error'); updateStep(4, 'error');
          alert(language === 'en' ? `⚠️ Video processing failed: ${videoError.message || 'Unknown error'}.\n\nYour property was created successfully. You can edit it later to add videos.` : `⚠️ El procesamiento de video falló: ${videoError.message || 'Error desconocido'}.\n\nTu propiedad fue creada exitosamente. Puedes editarla después para agregar videos.`);
        }
      }

      updateResponse = await fetch(`/api/property/update/${propertyId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ photos: photoUrls, video_urls: videoUrls, mux_asset_ids: muxAssetIds, video_processing: false }) });

      const lastStep = hasVideos ? 5 : 3;
      updateStep(lastStep, 'active', language === 'en' ? 'Finalizing image processing...' : 'Finalizando el procesamiento de imágenes...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      updateStep(lastStep, 'active', language === 'en' ? 'Finalizing property...' : 'Finalizando propiedad...');
      updateResponse = await fetch(`/api/property/update/${propertyId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ photos: photoUrls, video_urls: videoUrls, video_processing: false }) });
      updateStep(lastStep, 'completed', language === 'en' ? '✓ All done!' : '✓ ¡Todo listo!');
      await new Promise(resolve => setTimeout(resolve, 1500));

      setTempPhotoUrls([]); setPhotos([]); setVideos([]);
      setPublishingModalOpen(false);
      trackEvent('Lead', { content_name: 'Property Created', currency: 'CRC' });

      const propertiesResponse = await fetch('/api/property/list');
      const propertiesData = await propertiesResponse.json();
      const isFirstProperty = (propertiesData.properties || []).length === 1;
      if (isFirstProperty) localStorage.setItem('showSuccessModal', 'true');
      router.push(`/p/${slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al publicar');
      setPublishingModalOpen(false);
    } finally { setIsProcessing(false); setVideoProgress(''); }
  };

  const handleCustomFieldChange = (fieldKey: string, value: string) => {
    setCustomFieldsValues(prev => ({ ...prev, [fieldKey]: value }));
  };
  const getCustomFieldValue = (fieldKey: string): string => customFieldsValues[fieldKey] || '';
  const getFieldName = (field: CustomField): string => {
    if (propertyLanguage === 'en' && field.field_name_en) return field.field_name_en;
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
      house: t('createProperty.house'), condo: t('createProperty.condo'),
      apartment: t('createProperty.apartment'), land: t('createProperty.land'),
      commercial: t('createProperty.commercial'), hotel: t('createProperty.hotel'),
      finca: t('createProperty.finca'), ranch: t('createProperty.ranch'), other: t('createProperty.other'),
    };
    return labels[type] || type;
  };

  const getListingTypeLabel = (type: string) => type === 'sale' ? t('createProperty.sale') : t('createProperty.rent');

  const handleImportPost = async (post: any) => {
    if (!propertyType || !listingType) { setError('Primero selecciona el tipo de propiedad y tipo de operación'); return; }
    try {
      const checkResp = await fetch(`/api/facebook/check-import?postId=${post.id}`);
      const { alreadyImported } = await checkResp.json();
      if (alreadyImported) {
        const proceed = confirm(propertyLanguage === 'en' ? '⚠️ This post was already imported as a property. Do you want to import it again?' : '⚠️ Este post ya fue importado como propiedad anteriormente. ¿Deseas importarlo de nuevo?');
        if (!proceed) return;
      }
    } catch (err) { console.warn('No se pudo verificar duplicado:', err); }
    setImportingPost(true); setShowImportModal(true); setError(null); setSelectedPost(post);
    try {
      const response = await fetch('/api/facebook/import-post', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: post.id, property_type: propertyType, listing_type: listingType, language: propertyLanguage, custom_fields: customFields }),
      });
      if (!response.ok) { const data = await response.json(); throw new Error(data.error || 'Error al importar post'); }
      const data = await response.json();
      const importedPhotos = data.property.photos || [];
      setTempPhotoUrls(importedPhotos);
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            await detectCountryFromLocation(latitude, longitude);
            const plusCode = generatePlusCode(latitude, longitude);
            setPropertyData({ ...data.property, property_type: propertyType, listing_type: listingType, language: propertyLanguage, currency_id: selectedCurrency, latitude, longitude, plus_code: plusCode, show_map: true, photos: importedPhotos });
            setCustomFieldsValues(data.property.custom_fields_data || {});
          },
          () => {
            setPropertyData({ ...data.property, property_type: propertyType, listing_type: listingType, language: propertyLanguage, currency_id: selectedCurrency, latitude: null, longitude: null, plus_code: null, show_map: true, photos: importedPhotos });
            setCustomFieldsValues(data.property.custom_fields_data || {});
          }
        );
      } else {
        setPropertyData({ ...data.property, property_type: propertyType, listing_type: listingType, language: propertyLanguage, currency_id: selectedCurrency, latitude: null, longitude: null, plus_code: null, show_map: true, photos: importedPhotos });
        setCustomFieldsValues(data.property.custom_fields_data || {});
      }
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    } catch (err: any) {
      setError(err.message || 'Error al importar post de Facebook');
    } finally { setImportingPost(false); setShowImportModal(false); }
  };

  return (
    <AppLayout title={t('createProperty.createTitle')} showBack={true} showTabs={true}>
      {/*
        mobile:  1 columna — fotos, config, voz, preview en secuencia
        tablet+: 2 columnas
          izquierda: config + voz + botón generar
          derecha sticky: fotos/videos arriba + preview/formulario abajo (scroll propio)
      */}
      <div className="px-4 py-6 md:px-6 md:py-6 md:grid md:grid-cols-2 md:gap-6 md:items-start lg:grid-cols-[1fr_480px]">

        {/* ── COLUMNA IZQUIERDA — Configuración + Voz ── */}
        <div className="space-y-6">

          {/* Intro */}
          <div className="text-center md:text-left">
            <p className="text-lg font-semibold" style={{ color: '#0F172A' }}>
              {t('createProperty.introText')}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Section 2: Property Configuration */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span>🏷️</span> {t('createProperty.step2')}
            </h2>

            <div className="grid grid-cols-1 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('createProperty.propertyType')}</label>
                <select value={propertyType} onChange={(e) => setPropertyType(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 font-semibold">
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
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('createProperty.listingType')}</label>
                <select value={listingType} onChange={(e) => setListingType(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 font-semibold">
                  <option value="sale">{t('createProperty.sale')}</option>
                  <option value="rent">{t('createProperty.rent')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  🌐 {t('createProperty.propertyLanguage')}
                  {propertyLanguage === language && (
                    <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-semibold">Default</span>
                  )}
                </label>
                <select value={propertyLanguage} onChange={(e) => setPropertyLanguage(e.target.value as 'es' | 'en')} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 font-semibold">
                  <option value="es">🇪🇸 {t('createProperty.spanish')}</option>
                  <option value="en">🇺🇸 {t('createProperty.english')}</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">💡 {t('createProperty.propertyLanguageTip')}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  💰 {t('createProperty.currency')}
                  {agentDefaultCurrency === selectedCurrency && (
                    <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-semibold">{t('createProperty.defaultCurrency')}</span>
                  )}
                </label>
                <select value={selectedCurrency || ''} onChange={(e) => setSelectedCurrency(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 font-semibold">
                  {currencies.map(currency => (
                    <option key={currency.id} value={currency.id}>{currency.symbol} {currency.code} - {currency.name}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">💡 {t('createProperty.currencyTip')}</p>
              </div>
            </div>

            {/* Custom Fields Hint */}
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
                      {propertyLanguage === 'en' ? 'Fields to mention in your recording:' : 'Campos a mencionar en tu grabación:'}
                    </h3>
                    <p className="text-sm text-blue-700">
                      {propertyLanguage === 'en' ? 'Mention these details so the AI fills them out automatically' : 'Menciona estos detalles para que la IA los complete automáticamente'}
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
                      {propertyLanguage === 'en' ? 'No custom fields yet!' : '¡Aún no tienes campos personalizados!'}
                    </h3>
                    <p className="text-sm text-purple-700">
                      {propertyLanguage === 'en' ? 'Load suggested fields to speed up your listing creation' : 'Carga campos sugeridos para agilizar la creación de tu propiedad'}
                    </p>
                  </div>
                </div>
                <button onClick={handleUseSuggestedFields} disabled={loadingSuggested} className="w-full py-3 rounded-xl font-bold text-white shadow-lg active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center gap-2" style={{ backgroundColor: '#8B5CF6' }}>
                  {loadingSuggested ? (
                    <><svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>{propertyLanguage === 'en' ? 'Loading...' : 'Cargando...'}</>
                  ) : (
                    <><span>🚀</span>{propertyLanguage === 'en' ? 'Use Suggested Fields' : 'Usar Campos Sugeridos'}</>
                  )}
                </button>
                <p className="text-xs text-purple-600 mt-3 text-center">
                  {propertyLanguage === 'en' ? 'You can edit or delete them later in Settings' : 'Podrás editarlos o eliminarlos después en Configuración'}
                </p>
              </div>
            ) : (
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-4">
                <div className="flex items-start gap-2">
                  <span className="text-2xl">ℹ️</span>
                  <div>
                    <p className="text-sm text-yellow-800 font-semibold mb-1">{t('createProperty.noCustomFields')}</p>
                    <button onClick={() => router.push('/settings/custom-fields')} className="text-sm text-blue-600 underline font-semibold">{t('createProperty.createCustomFields')}</button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Voice Recording */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span>📝</span> {t('createProperty.step3')}
            </h2>

            {/* Nota micrófono — solo visible en tablet/desktop */}
            <div className="hidden md:flex items-center gap-2 mb-4 px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: '#F0F9FF', color: '#0369A1' }}>
              <span>🎙️</span>
              <span>
                {propertyLanguage === 'en'
                  ? 'Use your laptop or tablet microphone, or connected headphones.'
                  : 'Usa el micrófono de tu laptop o tablet, o unos audífonos conectados.'}
              </span>
            </div>

            <VoiceRecorder
              onRecordingComplete={handleRecordingComplete}
              minDuration={10}
              maxDuration={120}
              instructionLanguage={propertyLanguage}
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
                  <><svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>{t('createProperty.generating')}</>
                ) : (
                  <><span>✨</span>{t('createProperty.generateWithAI')}</>
                )}
              </button>
            </div>
          )}

        </div>{/* fin columna izquierda */}

        {/* ── COLUMNA DERECHA — Fotos/Videos + Preview sticky ── */}
        <div className="space-y-6 mt-6 md:mt-0 md:sticky md:top-4 md:max-h-[calc(100vh-80px)] md:overflow-y-auto">

          {/* Section 1: Photos and Videos */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span>📸</span> {language === 'en' ? 'Photos and Videos' : 'Fotos y Videos'}
            </h2>

            <PhotoUploader
              onPhotosChange={handlePhotosChange}
              minPhotos={2}
              maxPhotos={15}
            />

            <div className="mt-6 pt-6 border-t border-gray-200">
              {session.user.plan === 'pro' ? (
                <>
                  <VideoUploader
                    onVideosChange={(files) => setVideos(files)}
                    maxVideos={4}
                    maxDurationSeconds={60}
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    💡 {language === 'en' ? 'Max 60 seconds total · Plays as a continuous playlist' : 'Máx 60 segundos en total · Se reproducen como playlist continua'}
                  </p>
                </>
              ) : (
                <div className="rounded-xl p-4 flex items-center gap-3" style={{ backgroundColor: '#FEF3C7', border: '2px solid #FDE68A' }}>
                  <span className="text-2xl">🎬</span>
                  <div>
                    <p className="text-sm font-bold" style={{ color: '#92400E' }}>{language === 'en' ? 'Videos are a Pro feature' : 'Los videos son una función Pro'}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#B45309' }}>{language === 'en' ? 'Upgrade to Pro to add videos to your properties' : 'Pásate a Pro para agregar videos a tus propiedades'}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 4: Generated Preview */}
          {propertyData && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span>✅</span> {t('createProperty.step4')}
              </h2>

              <div className="space-y-4">
                {/* Config summary */}
                <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">{t('createProperty.configuration')}:</p>
                      <p className="font-bold text-gray-900">
                        {getPropertyTypeLabel(propertyType)} → {getListingTypeLabel(listingType)} → {getSelectedCurrencySymbol()} {currencies.find(c => c.id === selectedCurrency)?.code} → {propertyLanguage === 'es' ? '🇪🇸 Español' : '🇺🇸 English'}
                      </p>
                    </div>
                    <button onClick={() => { setPropertyData(null); setCustomFieldsValues({}); }} className="text-sm text-blue-600 underline font-semibold">
                      {t('createProperty.changeConfig')}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">ℹ️ {t('createProperty.changeConfigTip')}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('createProperty.title')}</label>
                  <input type="text" value={propertyData.title} onChange={(e) => setPropertyData({ ...propertyData, title: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 font-semibold" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('createProperty.description')}</label>
                  <textarea value={propertyData.description} onChange={(e) => setPropertyData({ ...propertyData, description: e.target.value })} rows={6} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('createProperty.price')} ({getSelectedCurrencySymbol()})</label>
                  <input type="number" value={propertyData.price || ''} onChange={(e) => setPropertyData({ ...propertyData, price: Number(e.target.value) || null })} placeholder={t('createProperty.optional')} className="w-full px-3 py-2 border border-gray-300 text-gray-900 rounded-lg" />
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('createProperty.address')}</label>
                    <input type="text" value={propertyData.address} onChange={(e) => setPropertyData({ ...propertyData, address: e.target.value })} className="w-full px-3 py-2 border border-gray-300 text-gray-900 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('createProperty.city')}</label>
                    <input type="text" value={propertyData.city} onChange={(e) => setPropertyData({ ...propertyData, city: e.target.value })} className="w-full px-3 py-2 border border-gray-300 text-gray-900 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('createProperty.state')}</label>
                    <input type="text" value={propertyData.state} onChange={(e) => setPropertyData({ ...propertyData, state: e.target.value })} className="w-full px-3 py-2 border border-gray-300 text-gray-900 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('createProperty.zipCode')}</label>
                    <input type="text" value={propertyData.zip_code} onChange={(e) => setPropertyData({ ...propertyData, zip_code: e.target.value })} className="w-full px-3 py-2 border border-gray-300 text-gray-900 rounded-lg" />
                  </div>
                </div>

                {/* Map section */}
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={propertyData.show_map} onChange={(e) => setPropertyData({ ...propertyData, show_map: e.target.checked })} className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                      <span className="text-sm font-medium text-gray-700">🗺️ {t('createProperty.showOnMap')}</span>
                    </label>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-semibold mb-2 text-gray-700">🌎 {t('createProperty.propertyCountry')}</label>
                    <select value={selectedCountry} onChange={(e) => setSelectedCountry(e.target.value as CountryCode)} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-base text-gray-900 bg-white font-semibold">
                      {SUPPORTED_COUNTRIES.map((country) => (
                        <option key={country.code} value={country.code}>{country.flag} {country.name}</option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-600 mt-1">{propertyData?.latitude && propertyData?.longitude ? `📍 ${t('createProperty.countryDetected')}` : t('createProperty.selectCountry')}</p>
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
                      onLocationChange={(lat, lng, plusCode) => setPropertyData({ ...propertyData, latitude: lat, longitude: lng, plus_code: plusCode })}
                      editable={true}
                    />
                  )}
                </div>

                {/* Imported photos preview */}
                {tempPhotoUrls.length > 0 && (
                  <div className="pt-4 border-t border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">📸 {t('createProperty.importedPhotos')} ({tempPhotoUrls.length})</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {tempPhotoUrls.map((url, index) => (
                        <div key={index} className="relative aspect-square rounded-lg overflow-hidden">
                          <img src={url} alt={`Imported ${index + 1}`} className="w-full h-full object-cover" />
                          {index === 0 && <div className="absolute bottom-1 left-1 px-2 py-0.5 rounded text-xs font-bold text-white bg-blue-500">Principal</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Custom Fields */}
                {customFields.length > 0 && (
                  <div className="pt-4 border-t border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <span>🏷️</span>{t('createProperty.customFields')}
                    </h3>
                    <div className="space-y-3">
                      {customFields.map((field) => (
                        <div key={field.id}>
                          <label className="block text-sm font-semibold mb-2 flex items-center gap-2 text-gray-700">
                            <span className="text-lg">{field.icon || '🏷️'}</span>{getFieldName(field)}
                          </label>
                          <input
                            type={field.field_type === 'number' ? 'number' : 'text'}
                            value={getCustomFieldValue(field.field_key)}
                            onChange={(e) => handleCustomFieldChange(field.field_key, e.target.value)}
                            placeholder={field.placeholder}
                            maxLength={field.field_type === 'text' ? 200 : undefined}
                            className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none text-gray-900 font-semibold focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            style={{ borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' }}
                          />
                        </div>
                      ))}
                    </div>
                    {emptyCustomFields.length > 0 && (
                      <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <span className="text-xl">⚠️</span>
                          <div>
                            <p className="text-sm font-semibold text-yellow-800 mb-1">{t('createProperty.emptyFieldsWarning')}:</p>
                            <ul className="text-xs text-yellow-700 space-y-1">
                              {emptyCustomFields.map(field => <li key={field.id}>• {field.icon} {getFieldName(field)}</li>)}
                            </ul>
                            <p className="text-xs text-yellow-600 mt-2">{t('createProperty.emptyFieldsTip')}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {isProcessing && videoProgress && (
                  <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <p className="text-sm font-semibold text-purple-900">🎬 {videoProgress}</p>
                  </div>
                )}

                {/* Publish buttons */}
                <div className="flex gap-4 pt-4">
                  <button onClick={() => { setPropertyData(null); setCustomFieldsValues({}); }} className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50">
                    {t('createProperty.cancel')}
                  </button>
                  <button onClick={handlePublish} disabled={isProcessing} className="flex-1 px-6 py-3 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 disabled:opacity-50">
                    {isProcessing ? t('createProperty.publishing') : `🚀 ${t('createProperty.publishProperty')}`}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>{/* fin columna derecha */}

      </div>

      {/* Modal importar Facebook */}
      {showImportModal && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50" style={{ backdropFilter: 'blur(4px)' }} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-sm w-full">
              <div className="text-center">
                <div className="text-6xl mb-4 animate-bounce">📲</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {propertyLanguage === 'en' ? 'Importing Post...' : 'Importando Publicación...'}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  {propertyLanguage === 'en' ? 'Downloading images and extracting data with AI...' : 'Descargando imágenes y extrayendo datos con IA...'}
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

      <PublishingModal
        isOpen={publishingModalOpen}
        steps={publishingSteps}
        hasVideos={videos.length > 0}
        language={language}
      />
    </AppLayout>
  );
}