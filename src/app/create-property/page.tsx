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
import Image from 'next/image';

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  navy:      '#1B2D5B',
  navyMid:   '#243770',
  gold:      '#C9A84C',
  goldLight: '#E8C96A',
  goldPale:  '#F5EDD8',
  cream:     '#F8F6F2',
  white:     '#FFFFFF',
  charcoal:  '#1A1A2E',
  muted:     '#6B7280',
  border:    '#E8E4DC',
};

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

// ─── Subcomponentes de UI ─────────────────────────────────────────────────────

// Card contenedor de sección
const SectionCard = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div
    className={`rounded-2xl p-5 shadow-sm ${className}`}
    style={{ backgroundColor: T.white, border: `1px solid ${T.border}` }}
  >
    {children}
  </div>
);

// Título de sección con número de paso
const StepTitle = ({ step, title, subtitle }: { step: string; title: string; subtitle?: string }) => (
  <div className="flex items-start gap-3 mb-5">
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5"
      style={{ background: `linear-gradient(135deg, ${T.gold} 0%, ${T.goldLight} 100%)`, color: T.navy }}
    >
      {step}
    </div>
    <div>
      <h2 className="text-base font-bold" style={{ color: T.navy }}>{title}</h2>
      {subtitle && <p className="text-xs mt-0.5" style={{ color: T.muted }}>{subtitle}</p>}
    </div>
  </div>
);

// Input estilizado
const StyledInput = ({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
  <div>
    <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: T.muted }}>{label}</label>
    <input
      {...props}
      className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-colors"
      style={{ border: `1.5px solid ${T.border}`, backgroundColor: T.cream, color: T.charcoal }}
    />
  </div>
);

// Select estilizado
const StyledSelect = ({ label, children, ...props }: { label: string } & React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <div>
    <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: T.muted }}>{label}</label>
    <select
      {...props}
      className="w-full px-4 py-3 rounded-xl text-sm font-medium focus:outline-none transition-colors"
      style={{ border: `1.5px solid ${T.border}`, backgroundColor: T.cream, color: T.charcoal }}
    >
      {children}
    </select>
  </div>
);

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
    id: number; label: string; status: 'pending' | 'active' | 'completed' | 'error';
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

  // Facebook (kept for future)
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

  useEffect(() => { setPropertyLanguage(language); }, [language]);

  useEffect(() => {
    if (session) { loadCurrencies(); loadAgentDefaultCurrency(); loadAgentProfile(); }
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
        setSelectedCountry(country.code); return country.code;
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
    } catch (err) { setCustomFields([]); setCanUseSuggested(false); }
    finally { setLoadingCustomFields(false); }
  };

  const handleUseSuggestedFields = async () => {
    setLoadingSuggested(true);
    try {
      const response = await fetch('/api/custom-fields/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ property_type: propertyType, listing_type: listingType, language: propertyLanguage }),
      });
      if (!response.ok) { const data = await response.json(); throw new Error(data.error || 'Error'); }
      await loadCustomFields(propertyType, listingType);
    } catch (error) {
      alert(propertyLanguage === 'en' ? 'Error loading suggested fields' : 'Error al cargar campos sugeridos');
    } finally { setLoadingSuggested(false); }
  };

  if (status === 'loading') {
    return (
      <AppLayout title={t('createProperty.title')} showBack={true} showTabs={true}>
        <div className="flex items-center justify-center h-full" style={{ backgroundColor: T.cream }}>
          <div className="text-center py-12">
            <div className="text-5xl mb-4 animate-pulse">🏠</div>
            <div className="text-base font-medium" style={{ color: T.muted }}>{t('common.loading')}</div>
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
    setIsProcessing(true); setError(null);
    try {
      const transcription = await transcribeAudio(audioBlob);
      const generatedData = await generateDescription(transcription, propertyType, listingType, propertyLanguage, customFields);
      setPropertyData({
        ...generatedData, property_type: propertyType, listing_type: listingType,
        language: propertyLanguage, currency_id: selectedCurrency,
        latitude: null, longitude: null, plus_code: null, show_map: true,
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
    setIsProcessing(true); setError(null); setVideoProgress('');
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
        if (!agentId) throw new Error('No se pudo obtener el ID del agente para la subida');
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
          alert(language === 'en' ? `⚠️ Video processing failed: ${videoError.message || 'Unknown error'}.\n\nYour property was created successfully.` : `⚠️ El procesamiento de video falló: ${videoError.message || 'Error desconocido'}.\n\nTu propiedad fue creada exitosamente.`);
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

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <AppLayout title={t('createProperty.createTitle')} showBack={true} showTabs={true}>

      {/* ── MOBILE: layout original sin cambios ── */}
      <div className="md:hidden px-4 py-6 pb-24 space-y-6" style={{ backgroundColor: T.cream }}>

        {/* Error */}
        {error && (
          <div className="p-4 rounded-xl text-sm font-medium" style={{ backgroundColor: '#FEE2E2', color: '#DC2626', border: '1px solid #FCA5A5' }}>
            {error}
          </div>
        )}

        {/* Paso 1 — Config */}
        <div className="bg-white rounded-2xl shadow-sm border p-5" style={{ borderColor: T.border }}>
          <h2 className="text-lg font-semibold mb-4" style={{ color: T.navy }}>{t('createProperty.step2')}</h2>
          <div className="space-y-4">
            <select value={propertyType} onChange={(e) => setPropertyType(e.target.value)} className="w-full px-4 py-3 border rounded-lg text-gray-900 font-semibold" style={{ borderColor: T.border }}>
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
            <select value={listingType} onChange={(e) => setListingType(e.target.value)} className="w-full px-4 py-3 border rounded-lg text-gray-900 font-semibold" style={{ borderColor: T.border }}>
              <option value="sale">{t('createProperty.sale')}</option>
              <option value="rent">{t('createProperty.rent')}</option>
            </select>
            <select value={propertyLanguage} onChange={(e) => setPropertyLanguage(e.target.value as 'es' | 'en')} className="w-full px-4 py-3 border rounded-lg text-gray-900 font-semibold" style={{ borderColor: T.border }}>
              <option value="es">🇪🇸 {t('createProperty.spanish')}</option>
              <option value="en">🇺🇸 {t('createProperty.english')}</option>
            </select>
            <select value={selectedCurrency || ''} onChange={(e) => setSelectedCurrency(e.target.value)} className="w-full px-4 py-3 border rounded-lg text-gray-900 font-semibold" style={{ borderColor: T.border }}>
              {currencies.map(currency => (
                <option key={currency.id} value={currency.id}>{currency.symbol} {currency.code} - {currency.name}</option>
              ))}
            </select>
            {/* Custom fields hint mobile */}
            {customFields.length > 0 && (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4">
                <p className="font-bold text-blue-900 text-sm mb-2">{propertyLanguage === 'en' ? 'Mention in your recording:' : 'Menciona en tu grabación:'}</p>
                <div className="space-y-1">
                  {customFields.map(field => (
                    <div key={field.id} className="flex items-center gap-2 text-sm font-semibold text-blue-900">
                      <span>{field.icon}</span><span>{getFieldName(field)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Paso 2 — Fotos + Videos mobile */}
        <div className="bg-white rounded-2xl shadow-sm border p-5" style={{ borderColor: T.border }}>
          <h2 className="text-lg font-semibold mb-4" style={{ color: T.navy }}>{language === 'en' ? 'Photos and Videos' : 'Fotos y Videos'}</h2>
          <PhotoUploader onPhotosChange={handlePhotosChange} minPhotos={2} maxPhotos={15} />
          <div className="mt-4 pt-4 border-t" style={{ borderColor: T.border }}>
            {session.user.plan === 'pro' ? (
              <VideoUploader onVideosChange={(files) => setVideos(files)} maxVideos={4} maxDurationSeconds={60} />
            ) : (
              <div className="rounded-xl p-4 flex items-center gap-3" style={{ backgroundColor: T.goldPale, border: `1px solid rgba(201,168,76,0.35)` }}>
                <span className="text-2xl">🎬</span>
                <div>
                  <p className="text-sm font-bold" style={{ color: T.navy }}>{language === 'en' ? 'Videos are a Pro feature' : 'Los videos son una función Pro'}</p>
                  <p className="text-xs mt-0.5" style={{ color: T.muted }}>{language === 'en' ? 'Upgrade to Pro to add videos' : 'Pásate a Pro para agregar videos'}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Paso 3 — Voz mobile */}
        <div className="bg-white rounded-2xl shadow-sm border p-5" style={{ borderColor: T.border }}>
          <h2 className="text-lg font-semibold mb-4" style={{ color: T.navy }}>{t('createProperty.step3')}</h2>
          <VoiceRecorder onRecordingComplete={handleRecordingComplete} minDuration={10} maxDuration={120} instructionLanguage={propertyLanguage} />
        </div>

        {/* Generar mobile */}
        {!propertyData && (
          <button onClick={handleGenerate} disabled={!canGenerate || isProcessing} className="w-full py-4 rounded-xl font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2" style={{ background: `linear-gradient(135deg, ${T.gold} 0%, ${T.goldLight} 100%)`, color: T.navy }}>
            {isProcessing ? <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>{t('createProperty.generating')}</> : <><span>✨</span>{t('createProperty.generateWithAI')}</>}
          </button>
        )}

        {/* Preview mobile */}
        {propertyData && (
          <div className="bg-white rounded-2xl shadow-sm border p-5 space-y-4" style={{ borderColor: T.border }}>
            <h2 className="text-lg font-semibold" style={{ color: T.navy }}>{t('createProperty.step4')}</h2>
            {/* ... mobile preview content idéntico al original ... */}
            <div className="bg-gray-50 border rounded-lg p-3 text-sm">
              <p className="font-bold text-gray-900 mb-1">{t('createProperty.configuration')}:</p>
              <p className="text-gray-700">{getPropertyTypeLabel(propertyType)} → {getListingTypeLabel(listingType)} → {getSelectedCurrencySymbol()} {currencies.find(c => c.id === selectedCurrency)?.code} → {propertyLanguage === 'es' ? '🇪🇸' : '🇺🇸'}</p>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">{t('createProperty.title')}</label><input type="text" value={propertyData.title} onChange={(e) => setPropertyData({ ...propertyData, title: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-gray-900 font-semibold" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">{t('createProperty.description')}</label><textarea value={propertyData.description} onChange={(e) => setPropertyData({ ...propertyData, description: e.target.value })} rows={5} className="w-full px-3 py-2 border rounded-lg text-gray-900" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">{t('createProperty.price')} ({getSelectedCurrencySymbol()})</label><input type="number" value={propertyData.price || ''} onChange={(e) => setPropertyData({ ...propertyData, price: Number(e.target.value) || null })} className="w-full px-3 py-2 border text-gray-900 rounded-lg" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">{t('createProperty.address')}</label><input type="text" value={propertyData.address} onChange={(e) => setPropertyData({ ...propertyData, address: e.target.value })} className="w-full px-3 py-2 border text-gray-900 rounded-lg" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">{t('createProperty.city')}</label><input type="text" value={propertyData.city} onChange={(e) => setPropertyData({ ...propertyData, city: e.target.value })} className="w-full px-3 py-2 border text-gray-900 rounded-lg" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">{t('createProperty.state')}</label><input type="text" value={propertyData.state} onChange={(e) => setPropertyData({ ...propertyData, state: e.target.value })} className="w-full px-3 py-2 border text-gray-900 rounded-lg" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">{t('createProperty.zipCode')}</label><input type="text" value={propertyData.zip_code} onChange={(e) => setPropertyData({ ...propertyData, zip_code: e.target.value })} className="w-full px-3 py-2 border text-gray-900 rounded-lg" /></div>
            <div className="pt-4 border-t">
              <label className="flex items-center gap-2 cursor-pointer mb-4">
                <input type="checkbox" checked={propertyData.show_map} onChange={(e) => setPropertyData({ ...propertyData, show_map: e.target.checked })} className="w-5 h-5" />
                <span className="text-sm font-medium text-gray-700">🗺️ {t('createProperty.showOnMap')}</span>
              </label>
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2 text-gray-700">🌎 {t('createProperty.propertyCountry')}</label>
                <select value={selectedCountry} onChange={(e) => setSelectedCountry(e.target.value as CountryCode)} className="w-full px-4 py-3 border-2 rounded-lg text-base text-gray-900 bg-white font-semibold">
                  {SUPPORTED_COUNTRIES.map((country) => (<option key={country.code} value={country.code}>{country.flag} {country.name}</option>))}
                </select>
              </div>
              {propertyData.show_map && (
                <GoogleMapEditor address={propertyData.address} city={propertyData.city} state={propertyData.state} selectedCountry={selectedCountry} initialLat={propertyData.latitude} initialLng={propertyData.longitude} initialPlusCode={propertyData.plus_code} onLocationChange={(lat, lng, plusCode) => setPropertyData({ ...propertyData, latitude: lat, longitude: lng, plus_code: plusCode })} editable={true} />
              )}
            </div>
            {customFields.length > 0 && (
              <div className="pt-4 border-t">
                <h3 className="text-lg font-semibold mb-3">{t('createProperty.customFields')}</h3>
                <div className="space-y-3">
                  {customFields.map((field) => (
                    <div key={field.id}>
                      <label className="block text-sm font-semibold mb-2 flex items-center gap-2 text-gray-700"><span>{field.icon}</span>{getFieldName(field)}</label>
                      <input type={field.field_type === 'number' ? 'number' : 'text'} value={getCustomFieldValue(field.field_key)} onChange={(e) => handleCustomFieldChange(field.field_key, e.target.value)} placeholder={field.placeholder} className="w-full px-4 py-3 rounded-xl border-2 text-gray-900" style={{ borderColor: T.border }} />
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-3 pt-4">
              <button onClick={() => { setPropertyData(null); setCustomFieldsValues({}); }} className="flex-1 px-4 py-3 border rounded-xl font-bold text-sm" style={{ borderColor: T.border, color: T.charcoal }}>{t('createProperty.cancel')}</button>
              <button onClick={handlePublish} disabled={isProcessing} className="flex-1 px-4 py-3 rounded-xl font-bold text-sm text-white disabled:opacity-50" style={{ backgroundColor: '#15803D' }}>
                {isProcessing ? t('createProperty.publishing') : `🚀 ${t('createProperty.publishProperty')}`}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TABLET / DESKTOP — 2 columnas con scroll independiente
      ══════════════════════════════════════════════════════════════════════ */}
      <div
        className="hidden md:grid md:grid-cols-2 lg:grid-cols-[1fr_480px]"
        style={{
          height: 'calc(100vh - 57px)',
          backgroundColor: T.cream,
        }}
      >

        {/* ── COLUMNA IZQUIERDA: Config + Voz ── */}
        <div
          className="overflow-y-auto p-6 space-y-5"
          style={{ borderRight: `1px solid ${T.border}` }}
        >

          {/* Encabezado motivacional */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div style={{ width: '3px', height: '22px', backgroundColor: T.gold, borderRadius: '2px', flexShrink: 0 }} />
              <h1 className="text-xl font-bold tracking-tight" style={{ color: T.navy }}>
                {language === 'en' ? 'Create Property' : 'Crear Propiedad'}
              </h1>
            </div>
            <p className="text-sm leading-relaxed pl-4" style={{ color: T.muted }}>
              {language === 'en'
                ? 'Complete the following steps to generate your listing in seconds. Start here ↓'
                : 'Completa los siguientes pasos para generar tu propiedad en segundos. Empieza aquí ↓'}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="p-4 rounded-xl text-sm font-medium" style={{ backgroundColor: '#FEE2E2', color: '#DC2626', border: '1px solid #FCA5A5' }}>
              {error}
            </div>
          )}

          {/* PASO 1 — Configuración */}
          <SectionCard>
            <StepTitle
              step="1"
              title={language === 'en' ? 'Property Configuration' : 'Configuración de la Propiedad'}
              subtitle={language === 'en' ? 'Set the type, language and currency' : 'Define el tipo, idioma y moneda'}
            />

            <div className="grid grid-cols-2 gap-4">
              <StyledSelect
                label={language === 'en' ? 'Property Type' : 'Tipo de Propiedad'}
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value)}
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
              </StyledSelect>

              <StyledSelect
                label={language === 'en' ? 'Listing Type' : 'Tipo de Operación'}
                value={listingType}
                onChange={(e) => setListingType(e.target.value)}
              >
                <option value="sale">{t('createProperty.sale')}</option>
                <option value="rent">{t('createProperty.rent')}</option>
              </StyledSelect>

              <StyledSelect
                label={language === 'en' ? 'Property Language' : 'Idioma de la Propiedad'}
                value={propertyLanguage}
                onChange={(e) => setPropertyLanguage(e.target.value as 'es' | 'en')}
              >
                <option value="es">🇪🇸 {t('createProperty.spanish')}</option>
                <option value="en">🇺🇸 {t('createProperty.english')}</option>
              </StyledSelect>

              <StyledSelect
                label={language === 'en' ? 'Currency' : 'Moneda'}
                value={selectedCurrency || ''}
                onChange={(e) => setSelectedCurrency(e.target.value)}
              >
                {currencies.map(currency => (
                  <option key={currency.id} value={currency.id}>{currency.symbol} {currency.code} - {currency.name}</option>
                ))}
              </StyledSelect>
            </div>

            {/* Custom fields hint */}
            {loadingCustomFields ? (
              <div className="mt-4 rounded-xl p-3 text-center text-sm" style={{ backgroundColor: T.cream, color: T.muted }}>
                ⏳ {t('common.loading')}...
              </div>
            ) : customFields.length > 0 ? (
              <div className="mt-4 rounded-xl p-4" style={{ backgroundColor: T.goldPale, border: `1px solid rgba(201,168,76,0.35)` }}>
                <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: T.navy }}>
                  💡 {language === 'en' ? 'Mention in your recording:' : 'Menciona en tu grabación:'}
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {customFields.map(field => (
                    <div key={field.id} className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: T.navy }}>
                      <span>{field.icon}</span><span>{getFieldName(field)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : canUseSuggested ? (
              <div className="mt-4 rounded-xl p-4" style={{ backgroundColor: '#F5F3FF', border: '1.5px solid #DDD6FE' }}>
                <p className="text-sm font-bold mb-1" style={{ color: '#6D28D9' }}>
                  ✨ {language === 'en' ? 'No custom fields yet' : '¡Aún no tienes campos personalizados!'}
                </p>
                <p className="text-xs mb-3" style={{ color: '#7C3AED' }}>
                  {language === 'en' ? 'Load suggested fields to speed up creation' : 'Carga campos sugeridos para agilizar la creación'}
                </p>
                <button
                  onClick={handleUseSuggestedFields}
                  disabled={loadingSuggested}
                  className="w-full py-2 rounded-lg font-bold text-sm text-white disabled:opacity-50"
                  style={{ backgroundColor: '#7C3AED' }}
                >
                  {loadingSuggested ? '⏳ ...' : `🚀 ${language === 'en' ? 'Use Suggested Fields' : 'Usar Campos Sugeridos'}`}
                </button>
              </div>
            ) : null}
          </SectionCard>

          {/* PASO 2 — Grabación de voz */}
          <SectionCard>
            <StepTitle
              step="2"
              title={language === 'en' ? 'Voice Recording' : 'Grabación de Voz'}
              subtitle={language === 'en' ? 'Describe the property for 30–120 seconds' : 'Describe la propiedad durante 30-120 segundos'}
            />

            {/* Nota micrófono desktop */}
            <div
              className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg text-xs font-medium"
              style={{ backgroundColor: T.cream, color: T.muted, border: `1px solid ${T.border}` }}
            >
              <span>🎙️</span>
              <span>
                {language === 'en'
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
          </SectionCard>

          {/* Botón Generar */}
          {!propertyData && (
            <button
              onClick={handleGenerate}
              disabled={!canGenerate || isProcessing}
              className="w-full py-4 rounded-xl font-bold text-sm shadow-sm disabled:opacity-40 flex items-center justify-center gap-2 transition-all active:scale-95"
              style={{
                background: canGenerate && !isProcessing
                  ? `linear-gradient(135deg, ${T.gold} 0%, ${T.goldLight} 100%)`
                  : T.border,
                color: canGenerate && !isProcessing ? T.navy : T.muted,
                boxShadow: canGenerate ? '0 4px 12px rgba(201,168,76,0.35)' : 'none',
              }}
            >
              {isProcessing ? (
                <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>{t('createProperty.generating')}</>
              ) : (
                <><span>✨</span>{t('createProperty.generateWithAI')}</>
              )}
            </button>
          )}

          {/* Checklist de progreso cuando no está completo */}
          {!propertyData && (
            <div className="rounded-xl p-4" style={{ backgroundColor: T.white, border: `1px solid ${T.border}` }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: T.muted }}>
                {language === 'en' ? 'Checklist' : 'Lista de verificación'}
              </p>
              <div className="space-y-2">
                {[
                  { done: photos.length >= 2, label: language === 'en' ? `Photos (${photos.length}/2 min)` : `Fotos (${photos.length}/2 mín)` },
                  { done: !!audioBlob, label: language === 'en' ? 'Voice recording' : 'Grabación de voz' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{
                        backgroundColor: item.done ? '#F0FDF4' : T.cream,
                        border: `1.5px solid ${item.done ? '#15803D' : T.border}`,
                      }}
                    >
                      {item.done && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#15803D" strokeWidth="3" strokeLinecap="round"><path d="M5 13l4 4L19 7"/></svg>}
                    </div>
                    <span style={{ color: item.done ? '#15803D' : T.muted }}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── COLUMNA DERECHA: Fotos/Videos + Preview ── */}
        <div className="overflow-y-auto p-6 space-y-5">

          {/* PASO 0 (visualmente) — Fotos y Videos */}
          <SectionCard>
            <StepTitle
              step="📸"
              title={language === 'en' ? 'Photos & Videos' : 'Fotos y Videos'}
              subtitle={language === 'en' ? 'Upload 2–15 photos. Videos optional (Pro).' : 'Sube 2–15 fotos. Videos opcional (Pro).'}
            />

            <PhotoUploader
              onPhotosChange={handlePhotosChange}
              minPhotos={2}
              maxPhotos={15}
            />

            <div className="mt-5 pt-5" style={{ borderTop: `1px solid ${T.border}` }}>
              {session.user.plan === 'pro' ? (
                <>
                  <VideoUploader
                    onVideosChange={(files) => setVideos(files)}
                    maxVideos={4}
                    maxDurationSeconds={60}
                  />
                  <p className="text-xs mt-2" style={{ color: T.muted }}>
                    💡 {language === 'en' ? 'Max 60 seconds total · Plays as continuous playlist' : 'Máx 60 segundos en total · Se reproducen como playlist continua'}
                  </p>
                </>
              ) : (
                <div
                  className="rounded-xl p-4 flex items-center gap-3"
                  style={{ backgroundColor: T.goldPale, border: `1px solid rgba(201,168,76,0.35)` }}
                >
                  <span className="text-2xl">🎬</span>
                  <div>
                    <p className="text-sm font-bold" style={{ color: T.navy }}>
                      {language === 'en' ? 'Videos are a Pro feature' : 'Los videos son una función Pro'}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: T.muted }}>
                      {language === 'en' ? 'Upgrade to Pro to add videos to your listings' : 'Pásate a Pro para agregar videos a tus propiedades'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </SectionCard>

          {/* PASO 3 — Preview generado por IA */}
          {propertyData && (
            <SectionCard>
              <StepTitle
                step="3"
                title={language === 'en' ? 'Review & Publish' : 'Revisar y Publicar'}
                subtitle={language === 'en' ? 'Edit the AI-generated content and publish' : 'Edita el contenido generado por IA y publica'}
              />

              <div className="space-y-4">
                {/* Config summary */}
                <div
                  className="flex items-start justify-between p-3 rounded-xl"
                  style={{ backgroundColor: T.cream, border: `1px solid ${T.border}` }}
                >
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: T.muted }}>{t('createProperty.configuration')}</p>
                    <p className="text-sm font-semibold" style={{ color: T.navy }}>
                      {getPropertyTypeLabel(propertyType)} · {getListingTypeLabel(listingType)} · {getSelectedCurrencySymbol()} {currencies.find(c => c.id === selectedCurrency)?.code} · {propertyLanguage === 'es' ? '🇪🇸' : '🇺🇸'}
                    </p>
                  </div>
                  <button
                    onClick={() => { setPropertyData(null); setCustomFieldsValues({}); }}
                    className="text-xs font-semibold underline flex-shrink-0 ml-3"
                    style={{ color: T.navy }}
                  >
                    {t('createProperty.changeConfig')}
                  </button>
                </div>

                <StyledInput
                  label={t('createProperty.title')}
                  type="text"
                  value={propertyData.title}
                  onChange={(e) => setPropertyData({ ...propertyData, title: e.target.value })}
                />

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: T.muted }}>{t('createProperty.description')}</label>
                  <textarea
                    value={propertyData.description}
                    onChange={(e) => setPropertyData({ ...propertyData, description: e.target.value })}
                    rows={6}
                    className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none"
                    style={{ border: `1.5px solid ${T.border}`, backgroundColor: T.cream, color: T.charcoal, resize: 'vertical' }}
                  />
                </div>

                <StyledInput
                  label={`${t('createProperty.price')} (${getSelectedCurrencySymbol()})`}
                  type="number"
                  value={propertyData.price || ''}
                  onChange={(e) => setPropertyData({ ...propertyData, price: Number(e.target.value) || null })}
                  placeholder={t('createProperty.optional')}
                />

                <div className="grid grid-cols-2 gap-4">
                  <StyledInput label={t('createProperty.address')} type="text" value={propertyData.address} onChange={(e) => setPropertyData({ ...propertyData, address: e.target.value })} />
                  <StyledInput label={t('createProperty.city')} type="text" value={propertyData.city} onChange={(e) => setPropertyData({ ...propertyData, city: e.target.value })} />
                  <StyledInput label={t('createProperty.state')} type="text" value={propertyData.state} onChange={(e) => setPropertyData({ ...propertyData, state: e.target.value })} />
                  <StyledInput label={t('createProperty.zipCode')} type="text" value={propertyData.zip_code} onChange={(e) => setPropertyData({ ...propertyData, zip_code: e.target.value })} />
                </div>

                {/* Mapa */}
                <div className="pt-4" style={{ borderTop: `1px solid ${T.border}` }}>
                  <label className="flex items-center gap-2 cursor-pointer mb-4">
                    <input
                      type="checkbox"
                      checked={propertyData.show_map}
                      onChange={(e) => setPropertyData({ ...propertyData, show_map: e.target.checked })}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm font-semibold" style={{ color: T.navy }}>🗺️ {t('createProperty.showOnMap')}</span>
                  </label>

                  <StyledSelect
                    label={`🌎 ${t('createProperty.propertyCountry')}`}
                    value={selectedCountry}
                    onChange={(e) => setSelectedCountry(e.target.value as CountryCode)}
                  >
                    {SUPPORTED_COUNTRIES.map((country) => (
                      <option key={country.code} value={country.code}>{country.flag} {country.name}</option>
                    ))}
                  </StyledSelect>

                  {propertyData.show_map && (
                    <div className="mt-4">
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
                    </div>
                  )}
                </div>

                {/* Custom Fields */}
                {customFields.length > 0 && (
                  <div className="pt-4" style={{ borderTop: `1px solid ${T.border}` }}>
                    <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: T.muted }}>
                      🏷️ {t('createProperty.customFields')}
                    </p>
                    <div className="space-y-3">
                      {customFields.map((field) => (
                        <div key={field.id}>
                          <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1.5" style={{ color: T.muted }}>
                            <span>{field.icon}</span>{getFieldName(field)}
                          </label>
                          <input
                            type={field.field_type === 'number' ? 'number' : 'text'}
                            value={getCustomFieldValue(field.field_key)}
                            onChange={(e) => handleCustomFieldChange(field.field_key, e.target.value)}
                            placeholder={field.placeholder}
                            className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none"
                            style={{ border: `1.5px solid ${T.border}`, backgroundColor: T.cream, color: T.charcoal }}
                          />
                        </div>
                      ))}
                    </div>
                    {emptyCustomFields.length > 0 && (
                      <div className="mt-3 rounded-xl p-3" style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A' }}>
                        <p className="text-xs font-semibold mb-1" style={{ color: '#B45309' }}>
                          ⚠️ {t('createProperty.emptyFieldsWarning')}:
                        </p>
                        <ul className="text-xs space-y-0.5" style={{ color: '#B45309' }}>
                          {emptyCustomFields.map(field => <li key={field.id}>• {field.icon} {getFieldName(field)}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Botones publicar */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => { setPropertyData(null); setCustomFieldsValues({}); }}
                    className="flex-1 py-3 rounded-xl font-bold text-sm active:scale-95 transition-transform"
                    style={{ border: `1.5px solid ${T.border}`, color: T.charcoal, backgroundColor: T.white }}
                  >
                    {t('createProperty.cancel')}
                  </button>
                  <button
                    onClick={handlePublish}
                    disabled={isProcessing}
                    className="flex-1 py-3 rounded-xl font-bold text-sm text-white disabled:opacity-50 active:scale-95 transition-transform"
                    style={{ backgroundColor: '#15803D', boxShadow: '0 2px 8px rgba(21,128,61,0.3)' }}
                  >
                    {isProcessing ? t('createProperty.publishing') : `🚀 ${t('createProperty.publishProperty')}`}
                  </button>
                </div>
              </div>
            </SectionCard>
          )}

        </div>
      </div>

      {/* Modal importar Facebook */}
      {showImportModal && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50" style={{ backdropFilter: 'blur(4px)' }} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="rounded-2xl p-8 shadow-2xl max-w-sm w-full" style={{ backgroundColor: T.white }}>
              <div className="text-center">
                <div className="text-6xl mb-4 animate-bounce">📲</div>
                <h3 className="text-xl font-bold mb-2" style={{ color: T.navy }}>
                  {propertyLanguage === 'en' ? 'Importing Post...' : 'Importando Publicación...'}
                </h3>
                <p className="text-sm mb-4" style={{ color: T.muted }}>
                  {propertyLanguage === 'en' ? 'Downloading images and extracting data with AI...' : 'Descargando imágenes y extrayendo datos con IA...'}
                </p>
                <div className="flex justify-center">
                  <svg className="animate-spin h-8 w-8" style={{ color: T.gold }} viewBox="0 0 24 24">
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