'use client';

import { useSession } from 'next-auth/react';
import { useI18nStore } from '@/lib/i18n-store';
import { useRouter, useParams } from 'next/navigation';
import { useTranslation } from '@/hooks/useTranslation';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import Image from 'next/image';
import imageCompression from 'browser-image-compression';
import VideoUploader from '@/components/property/VideoUploader';
import PublishingModal from '@/components/property/PublishingModal';
import SocialReelPublishModal from '@/components/SocialReelPublishModal';
import { uploadVideoToMux, waitForPlaybackId } from '@/lib/muxUpload';
import { WatermarkConfig } from '@/lib/watermark';
import GoogleMapEditor from '@/components/property/GoogleMapEditor';
import { SUPPORTED_COUNTRIES, CountryCode } from '@/lib/google-maps-config';

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  navy:      '#1B2D5B',
  gold:      '#C9A84C',
  goldLight: '#E8C96A',
  goldPale:  '#F5EDD8',
  cream:     '#F8F6F2',
  white:     '#FFFFFF',
  charcoal:  '#1A1A2E',
  muted:     '#6B7280',
  border:    '#E8E4DC',
  green:     '#15803D',
  greenBg:   '#F0FDF4',
  red:       '#DC2626',
  redBg:     '#FEF2F2',
};

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
  field_name_en: string | null;
  field_type: 'text' | 'number';
  placeholder: string;
  icon: string;
}

// ─── Subcomponentes de UI ─────────────────────────────────────────────────────
const SectionCard = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`rounded-2xl p-5 shadow-sm ${className}`} style={{ backgroundColor: T.white, border: `1px solid ${T.border}` }}>
    {children}
  </div>
);

const FieldLabel = ({ label }: { label: string }) => (
  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: T.muted }}>
    {label}
  </label>
);

const StyledInput = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    {...props}
    className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-colors"
    style={{ border: `1.5px solid ${T.border}`, backgroundColor: T.cream, color: T.charcoal }}
  />
);

const StyledSelect = ({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) => (
  <select
    {...props}
    className="w-full px-4 py-3 rounded-xl text-sm font-medium focus:outline-none appearance-none"
    style={{ border: `1.5px solid ${T.border}`, backgroundColor: T.cream, color: T.charcoal }}
  >
    {children}
  </select>
);

export default function EditPropertyPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t } = useTranslation();
  const params = useParams();
  const propertyId = params.id as string;
  const { language } = useI18nStore();

  const [property, setProperty] = useState<PropertyData | null>(null);
  const [propertySlug, setPropertySlug] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [existingPhotos, setExistingPhotos] = useState<string[]>([]);
  const [newPhotos, setNewPhotos] = useState<File[]>([]);
  const [newPhotosPreviews, setNewPhotosPreviews] = useState<string[]>([]);
  const [photosToDelete, setPhotosToDelete] = useState<string[]>([]);

  const [existingVideos, setExistingVideos] = useState<string[]>([]);
  const [newVideos, setNewVideos] = useState<File[]>([]);
  const [videoProgress, setVideoProgress] = useState<string>('');
  const [existingVideosDuration, setExistingVideosDuration] = useState<number>(0);
  const [existingMuxAssetIds, setExistingMuxAssetIds] = useState<string[]>([]);
  const [muxAssetIdsToDelete, setMuxAssetIdsToDelete] = useState<string[]>([]);

  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [customFieldsValues, setCustomFieldsValues] = useState<Record<string, string>>({});
  const [loadingCustomFields, setLoadingCustomFields] = useState(false);
  const [watermarkConfig, setWatermarkConfig] = useState<WatermarkConfig | null>(null);

  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState<string | null>(null);

  const [compressing, setCompressing] = useState(false);
  const [reelModalOpen, setReelModalOpen] = useState(false);

  const [savingModalOpen, setSavingModalOpen] = useState(false);
  const [savingSteps, setSavingSteps] = useState<{
    id: number;
    label: string;
    status: 'pending' | 'active' | 'completed' | 'error';
  }[]>([]);

  const [selectedCountry, setSelectedCountry] = useState<CountryCode>('CR');

  const getCustomFieldName = (field: CustomField): string => {
    if (property?.language === 'en' && field.field_name_en) return field.field_name_en;
    return field.field_name;
  };

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  useEffect(() => {
    if (propertyId) loadProperty();
  }, [propertyId]);

  useEffect(() => {
    if (property?.property_type && property?.listing_type) {
      loadCustomFields(property.property_type, property.listing_type);
    }
  }, [property?.property_type, property?.listing_type]);

  useEffect(() => {
    if (session) { loadCurrencies(); loadWatermarkConfig(); }
  }, [session]);

  const loadWatermarkConfig = async () => {
    try {
      const response = await fetch('/api/agent/profile');
      if (response.ok) {
        const data = await response.json();
        setWatermarkConfig({
          useCornerLogo: data.agent.use_corner_logo ?? true,
          cornerLogoUrl: data.agent.watermark_logo || null,
          position: data.agent.watermark_position || 'bottom-right',
          size: data.agent.watermark_size || 'medium',
          useWatermark: data.agent.use_watermark ?? false,
          watermarkUrl: data.agent.watermark_image || null,
          opacity: data.agent.watermark_opacity || 30,
          scale: data.agent.watermark_scale || 50,
        });
      }
    } catch (err) { console.error('Error loading watermark config:', err); }
  };

  const loadCurrencies = async () => {
    try {
      const response = await fetch('/api/currencies/list');
      if (response.ok) { const data = await response.json(); setCurrencies(data.currencies || []); }
    } catch (err) { console.error('Error al cargar divisas:', err); }
  };

  const loadProperty = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/property/get/${propertyId}`);
      if (!response.ok) throw new Error('No se pudo cargar la propiedad');
      const data = await response.json();
      setProperty(data.property);
      setPropertySlug(data.property.slug);
      setExistingPhotos(data.property.photos || []);
      const urls = data.property.video_urls || [];
      setExistingVideos(urls);
      setExistingMuxAssetIds(data.property.mux_asset_ids || []);
      if (urls.length > 0) {
        const durations = await Promise.all(urls.map(getVideoDuration));
        const total = durations.reduce((sum, d) => sum + d, 0);
        setExistingVideosDuration(total);
      }
      setSelectedCurrency(data.property.currency_id);
      setCustomFieldsValues(data.property.custom_fields_data || {});
    } catch (err: any) {
      console.error('Error loading property:', err);
      setError(err.message);
    } finally { setLoading(false); }
  };

  const loadCustomFields = async (propertyType: string, listingType: string) => {
    try {
      setLoadingCustomFields(true);
      const response = await fetch(`/api/custom-fields/list?property_type=${propertyType}&listing_type=${listingType}`);
      if (!response.ok) { setCustomFields([]); return; }
      const data = await response.json();
      setCustomFields(data.fields || []);
    } catch (err) { setCustomFields([]); }
    finally { setLoadingCustomFields(false); }
  };

  const handleCustomFieldChange = (fieldKey: string, value: string) => {
    setCustomFieldsValues(prev => ({ ...prev, [fieldKey]: value }));
  };

  const getCustomFieldValue = (fieldKey: string): string => customFieldsValues[fieldKey] || '';

  const compressImage = async (file: File): Promise<File> => {
    const options = { maxSizeMB: 0.5, maxWidthOrHeight: 1920, useWebWorker: true, fileType: 'image/jpeg' };
    try { return await imageCompression(file, options); }
    catch (error) { console.error('Error comprimiendo imagen:', error); return file; }
  };

  const getVideoDuration = (url: string): Promise<number> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => resolve(video.duration);
      video.onerror = () => resolve(0);
      video.src = url;
    });
  };

  const handleAddPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const totalPhotos = existingPhotos.length + newPhotos.length + files.length - photosToDelete.length;
    if (totalPhotos > 15) { alert('Máximo 15 fotos por propiedad'); return; }
    setCompressing(true);
    try {
      const processedFiles: File[] = [];
      for (const file of files) {
        const compressed = await compressImage(file);
        let finalFile = compressed;
        try {
          if (watermarkConfig?.useCornerLogo && watermarkConfig?.cornerLogoUrl) {
            const { applyCornerLogo } = await import('@/lib/watermark');
            finalFile = await applyCornerLogo(finalFile, { logoUrl: watermarkConfig.cornerLogoUrl, position: watermarkConfig.position, size: watermarkConfig.size });
          }
          if (watermarkConfig?.useWatermark && watermarkConfig?.watermarkUrl) {
            const { applyCenterWatermark } = await import('@/lib/watermark');
            finalFile = await applyCenterWatermark(finalFile, { logoUrl: watermarkConfig.watermarkUrl, opacity: watermarkConfig.opacity, scale: watermarkConfig.scale });
          }
          if (!watermarkConfig?.useCornerLogo && !watermarkConfig?.useWatermark) {
            const { applyDefaultText } = await import('@/lib/watermark');
            finalFile = await applyDefaultText(finalFile);
          }
        } catch (err) { console.error('Error aplicando marcas:', err); finalFile = compressed; }
        processedFiles.push(finalFile);
      }
      const previews = processedFiles.map(file => { try { return URL.createObjectURL(file); } catch { return ''; } }).filter(u => u !== '');
      setNewPhotos([...newPhotos, ...processedFiles]);
      setNewPhotosPreviews([...newPhotosPreviews, ...previews]);
    } catch (error) {
      console.error('Error procesando imágenes:', error);
      alert('Error al procesar las imágenes. Intenta subirlas de nuevo.');
    } finally {
      setCompressing(false);
      if (e.target) e.target.value = '';
    }
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

  const handleDeleteExistingVideo = async (index: number) => {
    const assetIdToDelete = existingMuxAssetIds[index];
    if (assetIdToDelete) setMuxAssetIdsToDelete(prev => [...prev, assetIdToDelete]);
    const updatedVideos = existingVideos.filter((_, i) => i !== index);
    setExistingVideos(updatedVideos);
    const updatedAssetIds = existingMuxAssetIds.filter((_, i) => i !== index);
    setExistingMuxAssetIds(updatedAssetIds);
    const durations = await Promise.all(updatedVideos.map(getVideoDuration));
    setExistingVideosDuration(durations.reduce((sum, d) => sum + d, 0));
  };

  const handleNewVideosChange = (files: File[]) => setNewVideos(files);

  const initSavingSteps = (hasNewVideos: boolean) => {
    const steps = [{ id: 1, label: language === 'en' ? 'Saving changes...' : 'Guardando cambios...', status: 'pending' as const }];
    if (newPhotos.length > 0) steps.push({ id: 2, label: language === 'en' ? 'Uploading new photos...' : 'Subiendo fotos nuevas...', status: 'pending' as const });
    if (hasNewVideos) {
      steps.push({ id: steps.length + 1, label: language === 'en' ? 'Uploading videos...' : 'Subiendo videos...', status: 'pending' as const });
      steps.push({ id: steps.length + 1, label: language === 'en' ? 'Processing videos...' : 'Procesando videos...', status: 'pending' as const });
    }
    steps.push({ id: steps.length + 1, label: language === 'en' ? 'Finishing up...' : 'Finalizando...', status: 'pending' as const });
    return steps;
  };

  const updateSavingStep = (stepId: number, status: 'pending' | 'active' | 'completed' | 'error', newLabel?: string) => {
    setSavingSteps(prev => prev.map(step => step.id === stepId ? { ...step, status, label: newLabel || step.label } : step));
  };

  const phone = session?.user?.phone || '';
  const phone2 = session?.user?.phone_2 || '';

  const handleInsertPhonesInDescription = () => {
    const phones = [phone, phone2].filter(Boolean);
    if (phones.length === 0) {
      alert(language === 'en' ? '⚠️ No phone numbers configured. Go to your profile and add them first.' : '⚠️ No tienes teléfonos configurados. Ve a tu perfil y agrégalos primero.');
      return;
    }
    const phoneLines = phones.map(p => `📱 ${p}`).join('\n');
    const block = language === 'en' ? `\n\n**📞 Call us:**\n${phoneLines}\n\n` : `\n\n**📞 Puedes contactarnos a los teléfonos:**\n${phoneLines}\n\n`;
    setProperty(prev => { if (!prev) return prev; return { ...prev, description: (prev.description || '') + block }; });
    alert(language === 'en' ? '✅ Phone numbers inserted.' : '✅ Teléfonos insertados.');
  };

  const handleSave = async () => {
    if (!property) return;
    const totalPhotos = existingPhotos.length + newPhotos.length;
    if (totalPhotos < 2) { setError('Mínimo 2 fotos requeridas'); return; }
    if (property.show_map) {
      if (!property.latitude || !property.longitude) { setError('Debes configurar la ubicación en el mapa'); return; }
      if (!property.plus_code) { setError('El Plus Code no se generó correctamente'); return; }
    }
    const hasNewVideos = newVideos.length > 0;
    const steps = initSavingSteps(hasNewVideos);
    setSavingSteps(steps);
    setSavingModalOpen(true);
    setSaving(true);
    setError(null);
    const stepIds = {
      save: 1,
      photos: newPhotos.length > 0 ? 2 : null,
      videos: hasNewVideos ? (newPhotos.length > 0 ? 3 : 2) : null,
      processing: hasNewVideos ? (newPhotos.length > 0 ? 4 : 3) : null,
      finish: steps[steps.length - 1].id,
    };
    try {
      updateSavingStep(stepIds.save, 'active');
      let uploadedUrls: string[] = [];
      if (newPhotos.length > 0) {
        updateSavingStep(stepIds.save, 'completed', language === 'en' ? '✓ Changes saved' : '✓ Cambios guardados');
        updateSavingStep(stepIds.photos!, 'active');
        for (const file of newPhotos) {
          const formData = new FormData();
          formData.append('photos', file);
          formData.append('propertySlug', propertySlug);
          const uploadResponse = await fetch('/api/property/upload-photos', { method: 'POST', body: formData });
          if (!uploadResponse.ok) throw new Error('Error al subir fotos');
          const uploadData = await uploadResponse.json();
          uploadedUrls.push(...uploadData.urls);
        }
        updateSavingStep(stepIds.photos!, 'completed', language === 'en' ? `✓ Photos uploaded (${uploadedUrls.length})` : `✓ Fotos subidas (${uploadedUrls.length})`);
      } else {
        updateSavingStep(stepIds.save, 'completed', language === 'en' ? '✓ Changes saved' : '✓ Cambios guardados');
      }
      const allPhotos = [...existingPhotos, ...uploadedUrls];
      let finalVideoUrls = [...existingVideos];
      let finalMuxAssetIds = [...existingMuxAssetIds];
      if (hasNewVideos) {
        try {
          const uploadIds: string[] = [];
          const playbackIds: string[] = [];
          for (let i = 0; i < newVideos.length; i++) {
            updateSavingStep(stepIds.videos!, 'active', language === 'en' ? `Uploading video ${i + 1} of ${newVideos.length}...` : `Subiendo video ${i + 1} de ${newVideos.length}...`);
            const uploadId = await uploadVideoToMux(newVideos[i], (progress) => { console.log(`Video ${i + 1} progress:`, progress); });
            uploadIds.push(uploadId);
          }
          updateSavingStep(stepIds.videos!, 'completed', language === 'en' ? `✓ Videos uploaded (${newVideos.length})` : `✓ Videos subidos (${newVideos.length})`);
          updateSavingStep(stepIds.processing!, 'active');
          for (let i = 0; i < uploadIds.length; i++) {
            updateSavingStep(stepIds.processing!, 'active', language === 'en' ? `Processing video ${i + 1} of ${uploadIds.length}...` : `Procesando video ${i + 1} de ${uploadIds.length}...`);
            const { playbackId, assetId } = await waitForPlaybackId(uploadIds[i]);
            playbackIds.push(playbackId);
            finalMuxAssetIds.push(assetId);
          }
          finalVideoUrls = [...existingVideos, ...playbackIds.map(id => `https://stream.mux.com/${id}/capped-1080p.mp4`)];
          updateSavingStep(stepIds.processing!, 'completed', language === 'en' ? '✓ Videos processed' : '✓ Videos procesados');
        } catch (videoError: any) {
          updateSavingStep(stepIds.videos!, 'error');
          updateSavingStep(stepIds.processing!, 'error');
          const errorMsg = videoError?.message || 'Error desconocido';
          alert(language === 'en' ? `⚠️ Video processing failed: ${errorMsg}. Property will be saved without new videos.` : `⚠️ Error procesando videos: ${errorMsg}. La propiedad se guardará sin los videos nuevos.`);
        }
      }
      updateSavingStep(stepIds.finish, 'active');
      const response = await fetch(`/api/property/update/${propertyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...property, photos: allPhotos, photosToDelete, custom_fields_data: customFieldsValues, video_urls: finalVideoUrls, mux_asset_ids: finalMuxAssetIds, mux_asset_ids_to_delete: muxAssetIdsToDelete }),
      });
      if (!response.ok) { const data = await response.json(); throw new Error(data.error || 'Error al guardar'); }
      updateSavingStep(stepIds.finish, 'completed', language === 'en' ? '✓ All done!' : '✓ ¡Todo listo!');
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSavingModalOpen(false);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
      setSavingModalOpen(false);
    } finally { setSaving(false); }
  };

  if (status === 'loading' || loading) {
    return (
      <AppLayout title="Cargando..." showBack={true} showTabs={true}>
        <div className="flex items-center justify-center h-full" style={{ backgroundColor: T.cream }}>
          <div className="text-center py-12">
            <div className="text-5xl mb-4 animate-pulse">✏️</div>
            <div className="text-base font-medium" style={{ color: T.muted }}>{t('common.editProperty.loading')}</div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!session || !property) return null;

  const totalPhotos = existingPhotos.length + newPhotos.length;

  return (
    <AppLayout title={t('common.editProperty.title')} showBack={true} showTabs={true}>
      <div className="edit-property-outer">

        {/* Error */}
        {error && (
          <div className="rounded-2xl p-4 mb-4 text-sm font-medium" style={{ backgroundColor: T.redBg, border: `1.5px solid ${T.red}`, color: T.red }}>
            {error}
          </div>
        )}

        <div className="edit-property-grid">

          {/* ── COLUMNA IZQUIERDA: Fotos + Videos ── */}
          <div className="edit-col-left space-y-4">

            {/* Fotos */}
            <SectionCard>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-sm" style={{ color: T.navy }}>
                  📸 {t('common.editProperty.photos')} ({totalPhotos}/15)
                </h3>
                <label className="cursor-pointer">
                  <input type="file" multiple accept="image/*" onChange={handleAddPhotos} className="hidden" disabled={totalPhotos >= 15 || compressing} />
                  <span
                    className="px-3 py-2 rounded-xl font-bold text-sm text-white active:scale-95 transition-transform inline-block"
                    style={{ backgroundColor: (totalPhotos >= 15 || compressing) ? T.muted : T.navy }}
                  >
                    {compressing ? `⏳ ${t('common.editProperty.compressing')}` : `➕ ${t('common.editProperty.addPhotos')}`}
                  </span>
                </label>
              </div>

              {existingPhotos.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: T.muted }}>
                    {t('common.editProperty.currentPhotos')}
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {existingPhotos.map((photo, index) => (
                      <div key={photo} className="relative aspect-square rounded-xl overflow-hidden">
                        <Image src={photo} alt={`Photo ${index + 1}`} fill className="object-cover" />
                        <button
                          onClick={() => handleDeleteExistingPhoto(photo)}
                          className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center bg-red-500 text-white shadow-lg active:scale-90 transition-transform text-xs"
                        >✕</button>
                        {index === 0 && (
                          <div className="absolute bottom-1 left-1 px-2 py-0.5 rounded text-[10px] font-bold text-white" style={{ backgroundColor: T.navy }}>
                            {t('photoUploader.principal')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {newPhotos.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: T.muted }}>
                    {t('common.editProperty.newPhotos')}
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {newPhotosPreviews.map((preview, index) => (
                      <div key={index} className="relative aspect-square rounded-xl overflow-hidden">
                        <Image src={preview} alt={`New ${index + 1}`} fill className="object-cover" />
                        <button
                          onClick={() => handleDeleteNewPhoto(index)}
                          className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center bg-red-500 text-white shadow-lg active:scale-90 transition-transform text-xs"
                        >✕</button>
                        <div className="absolute bottom-1 left-1 px-2 py-0.5 rounded text-[10px] font-bold text-white" style={{ backgroundColor: T.green }}>
                          {t('photoUploader.new')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {totalPhotos < 2 && (
                <p className="text-xs mt-2 font-medium" style={{ color: T.red }}>
                  ⚠️ {t('common.editProperty.minPhotosRequired')}
                </p>
              )}
            </SectionCard>

            {/* Videos */}
            <SectionCard>
              <h3 className="font-bold text-sm mb-4" style={{ color: T.navy }}>🎬 Videos</h3>

              {session.user.plan === 'pro' ? (
                <>
                  {existingVideos.length > 0 && (
                    <div className="space-y-3 mb-4">
                      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: T.muted }}>
                        Videos actuales:
                      </p>
                      {existingVideos.map((url, index) => (
                        <div key={index} className="relative rounded-xl overflow-hidden" style={{ border: `1px solid ${T.border}` }}>
                          <video src={url} className="w-full aspect-video object-cover bg-black" controls preload="metadata" />
                          <button
                            onClick={() => handleDeleteExistingVideo(index)}
                            className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center bg-red-500 text-white shadow-lg active:scale-90 transition-transform"
                          >✕</button>
                          <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold text-white" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
                            Video {index + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {existingVideos.length > 0 && (
                    <button
                      onClick={() => setReelModalOpen(true)}
                      className="w-full py-3 rounded-xl font-bold text-white active:scale-95 transition-transform mb-4 text-sm"
                      style={{ backgroundColor: '#1877F2' }}
                    >
                      🎬 {language === 'en' ? 'Publish Reel to Facebook' : 'Publicar Reel en Facebook'}
                    </button>
                  )}

                  {Math.floor(60 - existingVideosDuration) > 0 && (
                    <VideoUploader onVideosChange={handleNewVideosChange} maxVideos={4} maxDurationSeconds={Math.ceil(60 - existingVideosDuration)} />
                  )}

                  {Math.floor(60 - existingVideosDuration) <= 0 && (
                    <p className="text-xs text-center mt-2" style={{ color: T.muted }}>
                      {language === 'en' ? 'Maximum 60 seconds reached' : 'Has alcanzado el máximo de 60 segundos'}
                    </p>
                  )}

                  {videoProgress && (
                    <div className="mt-3 p-3 rounded-xl" style={{ backgroundColor: '#F5F3FF', border: '1px solid #DDD6FE' }}>
                      <p className="text-sm font-semibold" style={{ color: '#6D28D9' }}>🎬 {videoProgress}</p>
                    </div>
                  )}
                </>
              ) : (
                existingVideos.length > 0 ? (
                  <div className="rounded-xl p-4 flex items-center gap-3" style={{ backgroundColor: T.goldPale, border: `1px solid rgba(201,168,76,0.35)` }}>
                    <span className="text-2xl">🎬</span>
                    <div>
                      <p className="text-sm font-bold" style={{ color: T.navy }}>
                        {language === 'en' ? `This property has ${existingVideos.length} video${existingVideos.length > 1 ? 's' : ''} associated` : `Esta propiedad tiene ${existingVideos.length} video${existingVideos.length > 1 ? 's' : ''} relacionado${existingVideos.length > 1 ? 's' : ''}`}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: T.navy, opacity: 0.7 }}>
                        {language === 'en' ? 'Upgrade to Pro to view and manage your videos.' : 'Pásate a Pro para poder ver y gestionar tus videos.'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl p-4 flex items-center gap-3" style={{ backgroundColor: T.goldPale, border: `1px solid rgba(201,168,76,0.35)` }}>
                    <span className="text-2xl">🎬</span>
                    <div>
                      <p className="text-sm font-bold" style={{ color: T.navy }}>
                        {language === 'en' ? 'Videos are a Pro feature' : 'Los videos son una función Pro'}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: T.navy, opacity: 0.7 }}>
                        {language === 'en' ? 'Upgrade to Pro to add videos to your properties.' : 'Pásate al plan Pro para subir videos a tu propiedad.'}
                      </p>
                    </div>
                  </div>
                )
              )}
            </SectionCard>

          </div>{/* fin edit-col-left */}

          {/* ── COLUMNA DERECHA: Formulario ── */}
          <div className="edit-col-right space-y-4">

            {/* Badge idioma */}
            <SectionCard>
              <div className="flex items-center gap-3">
                {property.language === 'es' ? (
                  <svg width="28" height="20" viewBox="0 0 20 14" className="rounded-sm flex-shrink-0" aria-hidden="true">
                    <rect width="20" height="14" fill="#AA151B"/>
                    <rect y="3.5" width="20" height="7" fill="#F1BF00"/>
                  </svg>
                ) : (
                  <svg width="28" height="20" viewBox="0 0 20 14" className="rounded-sm flex-shrink-0" aria-hidden="true">
                    <rect width="20" height="14" fill="#B22234"/>
                    <rect y="1.08" width="20" height="1.08" fill="#FFFFFF"/>
                    <rect y="3.23" width="20" height="1.08" fill="#FFFFFF"/>
                    <rect y="5.38" width="20" height="1.08" fill="#FFFFFF"/>
                    <rect y="7.54" width="20" height="1.08" fill="#FFFFFF"/>
                    <rect y="9.69" width="20" height="1.08" fill="#FFFFFF"/>
                    <rect y="11.85" width="20" height="1.08" fill="#FFFFFF"/>
                    <rect width="8" height="7.54" fill="#3C3B6E"/>
                  </svg>
                )}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: T.muted }}>
                    {t('common.editProperty.propertyLanguage')}
                  </p>
                  <p className="text-base font-bold" style={{ color: T.navy }}>
                    {property.language === 'es' ? 'Español' : 'English'}
                  </p>
                </div>
              </div>
            </SectionCard>

            {/* Título */}
            <SectionCard>
              <FieldLabel label={t('common.editProperty.propertyTitle')} />
              <StyledInput
                type="text"
                value={property.title}
                onChange={(e) => setProperty({ ...property, title: e.target.value })}
              />
            </SectionCard>

            {/* Descripción */}
            <SectionCard>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold uppercase tracking-wider" style={{ color: T.muted }}>
                  {t('common.editProperty.description')}
                </label>
                <button
                  type="button"
                  onClick={handleInsertPhonesInDescription}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold active:scale-95 transition-transform"
                  style={{ backgroundColor: T.goldPale, color: T.navy, border: `1px solid rgba(201,168,76,0.35)` }}
                >
                  📲 {language === 'en' ? 'Insert phones' : 'Insertar tel.'}
                </button>
              </div>
              <textarea
                value={property.description}
                onChange={(e) => setProperty({ ...property, description: e.target.value })}
                rows={8}
                className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none resize-none"
                style={{ border: `1.5px solid ${T.border}`, backgroundColor: T.cream, color: T.charcoal }}
              />
            </SectionCard>

            {/* Precio y detalles */}
            <SectionCard>
              <p className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: T.muted }}>
                {t('common.editProperty.details')}
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel label={`${t('common.editProperty.price')} (${currencies.find(c => c.id === (selectedCurrency || property.currency_id))?.symbol || '$'})`} />
                  <StyledInput
                    type="number"
                    value={property.price || ''}
                    onChange={(e) => setProperty({ ...property, price: Number(e.target.value) || null })}
                  />
                </div>
                <div>
                  <FieldLabel label={t('common.editProperty.propertyType')} />
                  <StyledSelect value={property.property_type} onChange={(e) => setProperty({ ...property, property_type: e.target.value })}>
                    <option value="house">{t('common.editProperty.house')}</option>
                    <option value="condo">{t('common.editProperty.condo')}</option>
                    <option value="apartment">{t('common.editProperty.apartment')}</option>
                    <option value="land">{t('common.editProperty.land')}</option>
                    <option value="commercial">{t('common.editProperty.commercial')}</option>
                    <option value="hotel">{t('common.editProperty.hotel')}</option>
                    <option value="finca">{t('common.editProperty.finca')}</option>
                    <option value="quinta">{t('common.editProperty.quinta')}</option>
                    <option value="other">{t('common.editProperty.other')}</option>
                  </StyledSelect>
                </div>
                <div>
                  <FieldLabel label={t('common.editProperty.listingType')} />
                  <StyledSelect value={property.listing_type || 'sale'} onChange={(e) => setProperty({ ...property, listing_type: e.target.value })}>
                    <option value="sale">{t('common.editProperty.sale')}</option>
                    <option value="rent">{t('common.editProperty.rent')}</option>
                  </StyledSelect>
                </div>
                <div>
                  <FieldLabel label={`💰 ${t('common.editProperty.currency')}`} />
                  <StyledSelect
                    value={selectedCurrency || property.currency_id || ''}
                    onChange={(e) => { setSelectedCurrency(e.target.value); setProperty({ ...property, currency_id: e.target.value }); }}
                  >
                    {currencies.map(currency => (
                      <option key={currency.id} value={currency.id}>{currency.symbol} {currency.code} - {currency.name}</option>
                    ))}
                  </StyledSelect>
                  <p className="text-xs mt-1" style={{ color: T.muted }}>💡 {t('common.editProperty.currencyTip')}</p>
                </div>
              </div>
            </SectionCard>

            {/* Ubicación */}
            <SectionCard>
              <p className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: T.muted }}>
                📍 {t('common.editProperty.location')}
              </p>

              <div className="space-y-4">
                <div>
                  <FieldLabel label={t('common.editProperty.address')} />
                  <StyledInput type="text" value={property.address} onChange={(e) => setProperty({ ...property, address: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <FieldLabel label={t('common.editProperty.city')} />
                    <StyledInput type="text" value={property.city} onChange={(e) => setProperty({ ...property, city: e.target.value })} />
                  </div>
                  <div>
                    <FieldLabel label={t('common.editProperty.state')} />
                    <StyledInput type="text" value={property.state} onChange={(e) => setProperty({ ...property, state: e.target.value })} />
                  </div>
                  <div className="col-span-2">
                    <FieldLabel label={t('common.editProperty.zipCode')} />
                    <StyledInput type="text" value={property.zip_code} onChange={(e) => setProperty({ ...property, zip_code: e.target.value })} />
                  </div>
                </div>

                <div className="pt-4" style={{ borderTop: `1px solid ${T.border}` }}>
                  <label className="flex items-center gap-2 cursor-pointer mb-4">
                    <input
                      type="checkbox"
                      checked={property.show_map}
                      onChange={(e) => setProperty({ ...property, show_map: e.target.checked })}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm font-semibold" style={{ color: T.navy }}>
                      🗺️ {t('common.editProperty.showOnMap')}
                    </span>
                  </label>

                  <div className="mb-4">
                    <FieldLabel label={`🌎 ${t('common.editProperty.propertyCountry')}`} />
                    <StyledSelect value={selectedCountry} onChange={(e) => setSelectedCountry(e.target.value as CountryCode)}>
                      {SUPPORTED_COUNTRIES.map((country) => (
                        <option key={country.code} value={country.code}>{country.flag} {country.name}</option>
                      ))}
                    </StyledSelect>
                    <p className="text-xs mt-1" style={{ color: T.muted }}>{t('common.editProperty.selectCountry')}</p>
                  </div>

                  {property.show_map && (
                    <GoogleMapEditor
                      address={property.address}
                      city={property.city}
                      state={property.state}
                      selectedCountry={selectedCountry}
                      initialLat={property.latitude}
                      initialLng={property.longitude}
                      initialPlusCode={property.plus_code}
                      onLocationChange={(lat, lng, plusCode) => {
                        console.log('📍 Nueva ubicación:', lat, lng, plusCode);
                        setProperty({ ...property, latitude: lat, longitude: lng, plus_code: plusCode });
                      }}
                      editable={true}
                    />
                  )}
                </div>
              </div>
            </SectionCard>

            {/* Campos personalizados */}
            <SectionCard>
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: T.muted }}>
                  🏷️ {t('common.editProperty.customFields')}
                </p>
                {session.user.plan === 'pro' && (
                  <button
                    onClick={() => router.push('/settings/custom-fields')}
                    className="text-xs font-bold underline"
                    style={{ color: T.navy }}
                  >
                    {t('common.editProperty.manageFields')}
                  </button>
                )}
              </div>

              {loadingCustomFields ? (
                <div className="text-center py-4">
                  <div className="text-3xl mb-2 animate-pulse">⏳</div>
                  <p className="text-sm" style={{ color: T.muted }}>{t('common.editProperty.loadingFields')}</p>
                </div>
              ) : customFields.length > 0 ? (
                <div className="space-y-4">
                  {customFields.map((field) => (
                    <div key={field.id}>
                      <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1.5" style={{ color: T.muted }}>
                        <span>{field.icon || '🏷️'}</span>{getCustomFieldName(field)}
                      </label>
                      <input
                        type={field.field_type === 'number' ? 'number' : 'text'}
                        value={getCustomFieldValue(field.field_key)}
                        onChange={(e) => handleCustomFieldChange(field.field_key, e.target.value)}
                        placeholder={field.placeholder}
                        maxLength={field.field_type === 'text' ? 200 : undefined}
                        className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none"
                        style={{ border: `1.5px solid ${T.border}`, backgroundColor: T.cream, color: T.charcoal }}
                      />
                    </div>
                  ))}
                  <div className="px-3 py-2 rounded-xl text-xs" style={{ backgroundColor: T.goldPale, color: T.navy, border: `1px solid rgba(201,168,76,0.35)` }}>
                    💡 Los campos se guardan automáticamente al actualizar la propiedad.
                  </div>
                </div>
              ) : (
                <div className="rounded-xl p-5 text-center" style={{ backgroundColor: T.cream, border: `1px solid ${T.border}` }}>
                  <div className="text-3xl mb-2">📝</div>
                  <p className="text-sm font-semibold mb-1" style={{ color: T.navy }}>
                    {t('common.editProperty.noCustomFields')}
                  </p>
                  {property?.property_type && property?.listing_type && (
                    <p className="text-xs mb-3" style={{ color: T.muted }}>
                      Tipo: {property.property_type} → {property.listing_type === 'sale' ? 'Venta' : 'Alquiler'}
                    </p>
                  )}
                  <button
                    onClick={() => router.push('/settings/custom-fields')}
                    className="px-4 py-2 rounded-xl font-bold text-white text-sm active:scale-95 transition-transform"
                    style={{ backgroundColor: T.navy }}
                  >
                    ➕ {t('common.editProperty.createFields')}
                  </button>
                </div>
              )}
            </SectionCard>

            {/* Estado */}
            <SectionCard>
              <FieldLabel label={t('common.editProperty.propertyStatus')} />
              <StyledSelect value={property.status} onChange={(e) => setProperty({ ...property, status: e.target.value })}>
                <option value="active">{t('common.editProperty.active')}</option>
                <option value="pending">{t('common.editProperty.pending')}</option>
                <option value="sold">{t('common.editProperty.sold')}</option>
                <option value="rented">{t('common.editProperty.rented')}</option>
              </StyledSelect>
            </SectionCard>

            {/* Botones acción */}
            <div className="flex gap-3">
              <button
                onClick={() => router.back()}
                className="flex-1 py-3 rounded-xl font-bold text-sm active:scale-95 transition-transform"
                style={{ border: `1.5px solid ${T.border}`, color: T.charcoal, backgroundColor: T.white }}
              >
                {t('common.editProperty.cancel')}
              </button>
              <button
                onClick={handleSave}
                disabled={saving || totalPhotos < 2}
                className="flex-1 py-3 rounded-xl font-bold text-sm active:scale-95 transition-transform disabled:opacity-50"
                style={{
                  background: `linear-gradient(135deg, ${T.gold} 0%, ${T.goldLight} 100%)`,
                  color: T.navy,
                  boxShadow: '0 2px 8px rgba(201,168,76,0.3)',
                }}
              >
                {saving ? t('common.editProperty.saving') : `💾 ${t('common.editProperty.save')}`}
              </button>
            </div>

          </div>{/* fin edit-col-right */}

        </div>{/* fin edit-property-grid */}
      </div>{/* fin edit-property-outer */}

      <PublishingModal isOpen={savingModalOpen} steps={savingSteps} hasVideos={newVideos.length > 0} language={language} />

      <SocialReelPublishModal isOpen={reelModalOpen} onClose={() => setReelModalOpen(false)} propertyId={propertyId} videoUrls={existingVideos} language={language} />

      <style jsx global>{`
        .edit-property-outer {
          padding: 16px;
          background-color: #F8F6F2;
          min-height: 100%;
        }
        .edit-property-grid {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        @media (min-width: 768px) {
          .edit-property-outer {
            padding: 28px 32px;
            height: calc(100vh - 57px);
            overflow: hidden;
          }
          .edit-property-grid {
            display: grid;
            grid-template-columns: 380px 1fr;
            gap: 24px;
            align-items: start;
            height: 100%;
          }
          .edit-col-left {
            height: 100%;
            overflow-y: auto;
            padding-right: 4px;
          }
          .edit-col-right {
            height: 100%;
            overflow-y: auto;
            padding-right: 4px;
          }
        }
        @media (min-width: 1200px) {
          .edit-property-outer {
            padding: 32px 40px;
          }
          .edit-property-grid {
            grid-template-columns: 420px 1fr;
            gap: 32px;
          }
        }
      `}</style>
    </AppLayout>
  );
}