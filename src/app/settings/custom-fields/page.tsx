'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { useTranslation } from '@/hooks/useTranslation';
import { useI18nStore } from '@/lib/i18n-store';

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
  green:     '#15803D',
  greenBg:   '#F0FDF4',
  greenBorder:'#BBF7D0',
  red:       '#DC2626',
  redBg:     '#FEF2F2',
};

interface CustomField {
  id: string;
  property_type: string;
  listing_type: string;
  field_key: string;
  field_name: string;
  field_name_en: string | null;
  field_type: 'text' | 'number';
  placeholder: string;
  display_order: number;
  icon: string;
}

const PROPERTY_TYPES = [
  { value: 'house', label: '🏠 Casa' },
  { value: 'condo', label: '🏢 Condominio' },
  { value: 'apartment', label: '🏘️ Apartamento' },
  { value: 'land', label: '🌳 Terreno' },
  { value: 'commercial', label: '🏪 Comercial' },
  { value: 'hotel', label: '🏨 Hotel' },
  { value: 'finca', label: '🌾 Finca' },
  { value: 'ranch', label: '🌄 Quinta' },
  { value: 'other', label: '🏷️ Otros' },
];

const LISTING_TYPES = [
  { value: 'sale', label: '💰 Venta' },
  { value: 'rent', label: '🏠 Alquiler' },
];

const FIELD_TYPES = [
  { value: 'text', label: '📝 Texto' },
  { value: 'number', label: '🔢 Número' },
];

const AVAILABLE_ICONS = [
  '🏷️', '📏', '🛏️', '🚿', '🚗', '🏊', '🌳', '🏡', '🔑', '💎',
  '🌟', '⭐', '✨', '🎯', '📍', '🏖️', '🌊', '⛰️', '🌅', '🔥',
  '❄️', '☀️', '🌙', '💡', '🔒', '🚪', '🪟', '🏗️', '🧱', '📐',
  '⚡', '💧', '🏞️', '🌲', '🏔️', '🏝️', '🌴', '🎋', '🌺', '👶🏼',
  '🐶', '🏛️', '🐱', '🕌', '🏤', '🏦', '🏨', '🏩', '🏬', '🏭',
];

const MAX_FIELDS_PER_COMBO = 10;

// ── Subcomponentes de UI ──────────────────────────────────────────────────────
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
    className="w-full px-4 py-3 rounded-xl text-sm font-medium focus:outline-none"
    style={{ border: `1.5px solid ${T.border}`, backgroundColor: T.cream, color: T.charcoal }}
  >
    {children}
  </select>
);

export default function CustomFieldsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t } = useTranslation();
  const { language: currentLanguage } = useI18nStore();

  const [fields, setFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [fieldToClone, setFieldToClone] = useState<CustomField | null>(null);
  const [selectedPropertyType, setSelectedPropertyType] = useState('house');
  const [selectedListingType, setSelectedListingType] = useState('sale');
  const [fieldName, setFieldName] = useState('');
  const [fieldNameEn, setFieldNameEn] = useState('');
  const [fieldType, setFieldType] = useState<'text' | 'number'>('text');
  const [placeholder, setPlaceholder] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('🏷️');
  const [showIconPicker, setShowIconPicker] = useState(false);

  const [clonePropertyType, setClonePropertyType] = useState('house');
  const [cloneListingType, setCloneListingType] = useState('sale');

  const [filterPropertyType, setFilterPropertyType] = useState<string | null>(null);
  const [filterListingType, setFilterListingType] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  useEffect(() => {
    if (session) loadFields();
  }, [session]);

  const loadFields = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/custom-fields/list');
      if (!response.ok) throw new Error('Error al cargar campos');
      const data = await response.json();
      setFields(data.fields || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddField = async () => {
    if (!fieldName.trim()) { setError('El nombre del campo es obligatorio'); return; }
    if (fieldName.length > 30) { setError('El nombre no puede tener más de 30 caracteres'); return; }
    const currentCount = fields.filter(f => f.property_type === selectedPropertyType && f.listing_type === selectedListingType).length;
    if (currentCount >= MAX_FIELDS_PER_COMBO) { setError(`Máximo ${MAX_FIELDS_PER_COMBO} campos por combinación`); return; }
    setSaving(true); setError(null);
    try {
      const response = await fetch('/api/custom-fields/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property_type: selectedPropertyType,
          listing_type: selectedListingType,
          field_name: fieldName.trim(),
          field_name_en: fieldNameEn.trim() || fieldName.trim(),
          field_type: fieldType,
          placeholder: placeholder.trim() || `Ej: ${fieldName}`,
          icon: selectedIcon,
        }),
      });
      if (!response.ok) { const data = await response.json(); throw new Error(data.error || 'Error al crear campo'); }
      await loadFields();
      setFieldName(''); setFieldNameEn(''); setPlaceholder(''); setSelectedIcon('🏷️'); setShowAddForm(false);
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  const handleEditField = async () => {
    if (!editingField) return;
    if (!fieldName.trim()) { setError('El nombre del campo es obligatorio'); return; }
    if (fieldName.length > 30) { setError('El nombre no puede tener más de 30 caracteres'); return; }
    setSaving(true); setError(null);
    try {
      const response = await fetch(`/api/custom-fields/update/${editingField.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field_name: fieldName.trim(),
          field_name_en: fieldNameEn.trim() || fieldName.trim(),
          field_type: fieldType,
          placeholder: placeholder.trim() || `Ej: ${fieldName}`,
          icon: selectedIcon,
        }),
      });
      if (!response.ok) { const data = await response.json(); throw new Error(data.error || 'Error al actualizar campo'); }
      await loadFields();
      setEditingField(null); setFieldName(''); setFieldNameEn(''); setPlaceholder(''); setSelectedIcon('🏷️'); setShowAddForm(false);
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  const handleCloneField = async () => {
    if (!fieldToClone) return;
    setSaving(true); setError(null);
    try {
      const response = await fetch('/api/custom-fields/clone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field_id: fieldToClone.id, target_property_type: clonePropertyType, target_listing_type: cloneListingType }),
      });
      if (!response.ok) { const data = await response.json(); throw new Error(data.error || 'Error al clonar campo'); }
      await loadFields();
      setShowCloneModal(false); setFieldToClone(null);
      alert('✅ Campo clonado exitosamente');
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  const openCloneModal = (field: CustomField) => {
    setFieldToClone(field);
    setClonePropertyType('house');
    setCloneListingType('sale');
    setShowCloneModal(true);
    setError(null);
  };

  const handleDeleteField = async (fieldId: string) => {
    if (!confirm('¿Eliminar este campo personalizado?')) return;
    try {
      const response = await fetch(`/api/custom-fields/delete/${fieldId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Error al eliminar campo');
      await loadFields();
    } catch (err: any) { setError(err.message); }
  };

  const getFilteredFields = () => fields.filter(f => {
    if (filterPropertyType && f.property_type !== filterPropertyType) return false;
    if (filterListingType && f.listing_type !== filterListingType) return false;
    return true;
  });

  const getFieldsCount = (propertyType: string, listingType: string) =>
    fields.filter(f => f.property_type === propertyType && f.listing_type === listingType).length;

  const getTotalFieldsCount = () => fields.length;

  const getPropertyTypeLabel = (value: string) => {
    const labels: Record<string, { es: string; en: string }> = {
      house:      { es: '🏠 Casa',        en: '🏠 House' },
      condo:      { es: '🏢 Condominio',  en: '🏢 Condo' },
      apartment:  { es: '🏘️ Apartamento', en: '🏘️ Apartment' },
      land:       { es: '🌳 Terreno',     en: '🌳 Land' },
      commercial: { es: '🏪 Comercial',   en: '🏪 Commercial' },
      hotel:      { es: '🏨 Hotel',       en: '🏨 Hotel' },
      finca:      { es: '🌾 Finca',       en: '🌾 Farm' },
      ranch:      { es: '🌄 Quinta',      en: '🌄 Ranch' },
      other:      { es: '🏷️ Otros',       en: '🏷️ Other' },
    };
    return labels[value][currentLanguage] || labels[value].es;
  };

  const getListingTypeLabel = (value: string) => {
    const labels: Record<string, { es: string; en: string }> = {
      sale: { es: '💰 Venta',    en: '💰 Sale' },
      rent: { es: '🏠 Alquiler', en: '🏠 Rent' },
    };
    return labels[value][currentLanguage] || labels[value].es;
  };

  if (status === 'loading' || loading) {
    return (
      <AppLayout title={t('customFields.title')} showBack={true} showTabs={true}>
        <div className="flex items-center justify-center h-full" style={{ backgroundColor: T.cream }}>
          <div className="text-center py-12">
            <div className="text-5xl mb-4 animate-pulse">🏷️</div>
            <div className="text-base font-medium" style={{ color: T.muted }}>{t('common.loading')}</div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!session) return null;

  const filteredFields = getFilteredFields();
  const comboCount = getFieldsCount(selectedPropertyType, selectedListingType);
  const comboAtLimit = comboCount >= MAX_FIELDS_PER_COMBO;

  // ── Formulario compartido (add + edit inline) ─────────────────────────────
  const FieldForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl p-3 text-sm font-medium" style={{ backgroundColor: T.redBg, color: T.red, border: `1px solid #FECACA` }}>
          {error}
        </div>
      )}

      {!isEdit && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel label={t('customFields.propertyType')} />
              <StyledSelect value={selectedPropertyType} onChange={(e) => setSelectedPropertyType(e.target.value)}>
                {PROPERTY_TYPES.map(type => <option key={type.value} value={type.value}>{getPropertyTypeLabel(type.value)}</option>)}
              </StyledSelect>
            </div>
            <div>
              <FieldLabel label={t('customFields.listingType')} />
              <StyledSelect value={selectedListingType} onChange={(e) => setSelectedListingType(e.target.value)}>
                {LISTING_TYPES.map(type => <option key={type.value} value={type.value}>{getListingTypeLabel(type.value)}</option>)}
              </StyledSelect>
            </div>
          </div>
          <div
            className="px-3 py-2 rounded-xl text-xs font-semibold"
            style={{
              backgroundColor: comboAtLimit ? T.redBg : T.greenBg,
              color: comboAtLimit ? T.red : T.green,
              border: `1px solid ${comboAtLimit ? '#FECACA' : T.greenBorder}`,
            }}
          >
            <strong>{comboCount}/{MAX_FIELDS_PER_COMBO}</strong> {t('customFields.fieldsInCombo')}
          </div>
        </>
      )}

      {isEdit && editingField && (
        <div className="px-3 py-2 rounded-xl text-xs font-semibold" style={{ backgroundColor: T.goldPale, border: `1px solid rgba(201,168,76,0.35)`, color: T.navy }}>
          📌 {t('customFields.editingFor')}: <strong>{getPropertyTypeLabel(editingField.property_type)} → {getListingTypeLabel(editingField.listing_type)}</strong>
        </div>
      )}

      {/* Selector de ícono */}
      <div>
        <FieldLabel label={t('customFields.fieldIcon')} />
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowIconPicker(!showIconPicker)}
            className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl active:scale-95 transition-transform flex-shrink-0"
            style={{ border: `2px solid ${T.gold}`, backgroundColor: T.goldPale }}
          >
            {selectedIcon}
          </button>
          <div>
            <p className="text-sm font-semibold" style={{ color: T.navy }}>{t('customFields.iconSelected')}</p>
            <p className="text-xs" style={{ color: T.muted }}>{t('customFields.clickToChange')}</p>
          </div>
        </div>
        {showIconPicker && (
          <div
            className="mt-3 p-3 rounded-xl grid grid-cols-10 gap-1.5 max-h-48 overflow-y-auto"
            style={{ border: `1.5px solid ${T.border}`, backgroundColor: T.cream }}
          >
            {AVAILABLE_ICONS.map((icon) => (
              <button
                key={icon}
                type="button"
                onClick={() => { setSelectedIcon(icon); setShowIconPicker(false); }}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-xl active:scale-90 transition-transform"
                style={{ backgroundColor: selectedIcon === icon ? T.goldPale : T.white, border: `1.5px solid ${selectedIcon === icon ? T.gold : T.border}` }}
              >
                {icon}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Nombres */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <FieldLabel label={t('customFields.fieldName')} />
          <StyledInput type="text" value={fieldName} onChange={(e) => setFieldName(e.target.value)} placeholder={t('customFields.fieldNamePlaceholder')} maxLength={30} />
          <p className="text-xs mt-1" style={{ color: T.muted }}>⚠️ {t('customFields.maxChars')} ({fieldName.length}/30)</p>
        </div>
        <div>
          <FieldLabel label={t('customFields.fieldNameEn')} />
          <StyledInput type="text" value={fieldNameEn} onChange={(e) => setFieldNameEn(e.target.value)} placeholder={t('customFields.fieldNameEnPlaceholder')} maxLength={30} />
          <p className="text-xs mt-1" style={{ color: T.muted }}>💡 {t('customFields.bilingualTip')}</p>
        </div>
      </div>

      {/* Tipo + Placeholder */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <FieldLabel label={t('customFields.fieldType')} />
          <StyledSelect value={fieldType} onChange={(e) => setFieldType(e.target.value as 'text' | 'number')}>
            <option value="text">📝 {t('customFields.text')}</option>
            <option value="number">🔢 {t('customFields.number')}</option>
          </StyledSelect>
        </div>
        <div>
          <FieldLabel label={t('customFields.placeholder')} />
          <StyledInput type="text" value={placeholder} onChange={(e) => setPlaceholder(e.target.value)} placeholder={t('customFields.placeholderText')} maxLength={50} />
        </div>
      </div>

      {/* Botones */}
      <div className="flex gap-3 pt-1">
        <button
          onClick={() => {
            setShowAddForm(false); setEditingField(null);
            setFieldName(''); setFieldNameEn(''); setPlaceholder(''); setSelectedIcon('🏷️'); setError(null);
          }}
          className="flex-1 py-3 rounded-xl font-bold text-sm active:scale-95 transition-transform"
          style={{ border: `1.5px solid ${T.border}`, color: T.charcoal, backgroundColor: T.white }}
        >
          {t('common.cancel')}
        </button>
        <button
          onClick={isEdit ? handleEditField : handleAddField}
          disabled={saving || !fieldName.trim() || (!isEdit && comboAtLimit)}
          className="flex-1 py-3 rounded-xl font-bold text-sm active:scale-95 transition-transform disabled:opacity-50"
          style={{
            background: `linear-gradient(135deg, ${T.gold} 0%, ${T.goldLight} 100%)`,
            color: T.navy,
            boxShadow: '0 2px 8px rgba(201,168,76,0.3)',
          }}
        >
          {saving ? t('customFields.saving') : isEdit ? `💾 ${t('customFields.update')}` : `✅ ${t('customFields.save')}`}
        </button>
      </div>
    </div>
  );

  return (
    <AppLayout title={t('customFields.title')} showBack={true} showTabs={true}>
      <div className="px-4 pt-4 pb-24 md:px-6 md:pt-6 md:pb-12 md:max-w-5xl md:mx-auto space-y-4" style={{ backgroundColor: T.cream }}>

        {/* Título mobile */}
        <div className="flex items-center gap-2 md:hidden">
          <div style={{ width: '3px', height: '22px', backgroundColor: T.gold, borderRadius: '2px', flexShrink: 0 }} />
          <h1 className="text-xl font-bold tracking-tight" style={{ color: T.navy }}>{t('customFields.title')}</h1>
        </div>

        {/* Info + Stats */}
        <div className="space-y-3 md:space-y-0 md:grid md:grid-cols-2 md:gap-4">
          <div className="rounded-2xl p-4 flex items-start gap-3" style={{ backgroundColor: T.goldPale, border: `1px solid rgba(201,168,76,0.35)` }}>
            <span className="text-lg flex-shrink-0">💡</span>
            <p className="text-sm" style={{ color: T.navy, opacity: 0.85 }}>
              <strong>Tip:</strong> {t('customFields.tip')}
            </p>
          </div>
          <SectionCard>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: T.muted }}>{t('customFields.totalFields')}</p>
                <p className="text-3xl font-bold" style={{ color: T.navy }}>{getTotalFieldsCount()}</p>
              </div>
              <div className="text-4xl">🏷️</div>
            </div>
          </SectionCard>
        </div>

        {/* Error */}
        {error && !showAddForm && !editingField && !showCloneModal && (
          <div className="rounded-xl p-4 text-sm font-medium" style={{ backgroundColor: T.redBg, color: T.red, border: `1px solid #FECACA` }}>
            {error}
          </div>
        )}

        {/* Botón agregar */}
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full md:w-auto md:px-8 py-3.5 rounded-xl font-bold text-sm active:scale-95 transition-transform flex items-center justify-center gap-2"
            style={{
              background: `linear-gradient(135deg, ${T.navy} 0%, ${T.navyMid} 100%)`,
              color: T.white,
              boxShadow: '0 2px 8px rgba(27,45,91,0.25)',
            }}
          >
            ➕ {t('customFields.createNew')}
          </button>
        )}

        {/* Formulario agregar */}
        {showAddForm && (
          <SectionCard>
            <h3 className="font-bold text-base mb-4" style={{ color: T.navy }}>
              ➕ {t('customFields.newField')}
            </h3>
            <FieldForm isEdit={false} />
          </SectionCard>
        )}

        {/* Filtros */}
        <SectionCard>
          <h3 className="font-bold text-sm mb-3" style={{ color: T.navy }}>🔍 {t('customFields.filterFields')}</h3>
          <div className="grid grid-cols-2 gap-3">
            <StyledSelect value={filterPropertyType || ''} onChange={(e) => setFilterPropertyType(e.target.value || null)}>
              <option value="">{t('customFields.allTypes')}</option>
              {PROPERTY_TYPES.map(type => <option key={type.value} value={type.value}>{getPropertyTypeLabel(type.value)}</option>)}
            </StyledSelect>
            <StyledSelect value={filterListingType || ''} onChange={(e) => setFilterListingType(e.target.value || null)}>
              <option value="">{t('customFields.allStates')}</option>
              {LISTING_TYPES.map(type => <option key={type.value} value={type.value}>{getListingTypeLabel(type.value)}</option>)}
            </StyledSelect>
          </div>
          {(filterPropertyType || filterListingType) && (
            <button
              onClick={() => { setFilterPropertyType(null); setFilterListingType(null); }}
              className="mt-2 text-xs font-bold underline"
              style={{ color: T.navy }}
            >
              {t('customFields.clearFilters')}
            </button>
          )}
        </SectionCard>

        {/* Lista de campos */}
        <div className="space-y-3">
          <h3 className="font-bold text-sm px-1" style={{ color: T.navy }}>
            {t('customFields.fieldsCreated')} ({filteredFields.length})
          </h3>

          <div className="space-y-3 md:space-y-0 md:grid md:grid-cols-2 md:gap-4 lg:grid-cols-3">
            {filteredFields.length === 0 ? (
              <div className="rounded-2xl p-8 text-center md:col-span-full shadow-sm" style={{ backgroundColor: T.white, border: `1px solid ${T.border}` }}>
                <div className="text-5xl mb-3">📝</div>
                <p className="font-bold" style={{ color: T.navy }}>{t('customFields.noFields')}</p>
                <p className="text-sm mt-1" style={{ color: T.muted }}>{t('customFields.createFirst')}</p>
              </div>
            ) : (
              filteredFields.map(field => (
                <div
                  key={field.id}
                  className="rounded-2xl p-4 shadow-sm"
                  style={{ backgroundColor: T.white, border: `1px solid ${T.border}` }}
                >
                  <div className="flex items-start gap-3">
                    {/* Ícono */}
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                      style={{ backgroundColor: T.goldPale, border: `1px solid rgba(201,168,76,0.35)` }}
                    >
                      {field.icon || '🏷️'}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-base mb-1.5" style={{ color: T.navy }}>
                        {currentLanguage === 'en' && field.field_name_en ? field.field_name_en : field.field_name}
                      </h4>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {/* Tipo de propiedad */}
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold" style={{ backgroundColor: T.goldPale, color: T.navy, border: `1px solid rgba(201,168,76,0.35)` }}>
                          {getPropertyTypeLabel(field.property_type)}
                        </span>
                        {/* Tipo de operación */}
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold" style={{ backgroundColor: '#FFFBEB', color: '#B45309', border: '1px solid #FDE68A' }}>
                          {getListingTypeLabel(field.listing_type)}
                        </span>
                        {/* Tipo de campo */}
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold" style={{ backgroundColor: '#F5F3FF', color: '#6D28D9', border: '1px solid #DDD6FE' }}>
                          {field.field_type === 'text' ? `📝 ${t('customFields.text')}` : `🔢 ${t('customFields.number')}`}
                        </span>
                      </div>
                      {field.placeholder && (
                        <p className="text-xs" style={{ color: T.muted }}>💬 {field.placeholder}</p>
                      )}
                    </div>

                    {/* Acciones */}
                    <div className="flex flex-col gap-1.5">
                      {/* Editar */}
                      <button
                        onClick={() => {
                          setEditingField(field);
                          setFieldName(field.field_name);
                          setFieldNameEn(field.field_name_en || '');
                          setFieldType(field.field_type);
                          setPlaceholder(field.placeholder);
                          setSelectedIcon(field.icon || '🏷️');
                          setShowAddForm(false);
                          setError(null);
                        }}
                        className="p-2 rounded-xl active:scale-90 transition-transform"
                        style={{ backgroundColor: T.goldPale, color: T.navy }}
                        title="Editar campo"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      {/* Clonar */}
                      <button
                        onClick={() => openCloneModal(field)}
                        className="p-2 rounded-xl active:scale-90 transition-transform"
                        style={{ backgroundColor: '#F5F3FF', color: '#6D28D9' }}
                        title="Clonar campo"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                      {/* Eliminar */}
                      <button
                        onClick={() => handleDeleteField(field.id)}
                        className="p-2 rounded-xl active:scale-90 transition-transform"
                        style={{ backgroundColor: T.redBg, color: T.red }}
                        title="Eliminar campo"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── CLONE MODAL ─────────────────────────────────────────────── */}
        {showCloneModal && fieldToClone && (
          <>
            <div
              className="fixed inset-0 z-40"
              style={{ backgroundColor: 'rgba(27,45,91,0.6)', backdropFilter: 'blur(4px)' }}
              onClick={() => { setShowCloneModal(false); setFieldToClone(null); }}
            />
            <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-md mx-auto">
              <div className="rounded-2xl shadow-2xl overflow-hidden" style={{ backgroundColor: T.white, border: `1px solid ${T.border}` }}>
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4" style={{ backgroundColor: T.navy, borderBottom: `1px solid rgba(255,255,255,0.08)` }}>
                  <h3 className="font-bold text-base text-white">🔄 {t('customFields.cloneField')}</h3>
                  <button
                    onClick={() => { setShowCloneModal(false); setFieldToClone(null); }}
                    className="w-8 h-8 flex items-center justify-center rounded-full active:scale-90 transition-transform"
                    style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: T.white }}
                  >
                    ✕
                  </button>
                </div>

                <div className="p-5 space-y-4">
                  {/* Campo a clonar */}
                  <div className="rounded-xl p-3 flex items-center gap-3" style={{ backgroundColor: T.goldPale, border: `1px solid rgba(201,168,76,0.35)` }}>
                    <span className="text-2xl flex-shrink-0">{fieldToClone.icon || '🏷️'}</span>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider mb-0.5" style={{ color: T.muted }}>{t('customFields.fieldToClone')}</p>
                      <p className="font-bold text-sm" style={{ color: T.navy }}>{fieldToClone.field_name}</p>
                      <p className="text-xs" style={{ color: T.muted }}>
                        {t('customFields.from')}: {getPropertyTypeLabel(fieldToClone.property_type)} → {getListingTypeLabel(fieldToClone.listing_type)}
                      </p>
                    </div>
                  </div>

                  {/* Destino */}
                  <div>
                    <FieldLabel label={`${t('customFields.cloneTo')}:`} />
                    <div className="space-y-3">
                      <StyledSelect value={clonePropertyType} onChange={(e) => setClonePropertyType(e.target.value)}>
                        {PROPERTY_TYPES.map(type => <option key={type.value} value={type.value}>{getPropertyTypeLabel(type.value)}</option>)}
                      </StyledSelect>
                      <StyledSelect value={cloneListingType} onChange={(e) => setCloneListingType(e.target.value)}>
                        {LISTING_TYPES.map(type => <option key={type.value} value={type.value}>{getListingTypeLabel(type.value)}</option>)}
                      </StyledSelect>
                    </div>
                    <div
                      className="mt-3 px-3 py-2 rounded-xl text-xs font-semibold"
                      style={{
                        backgroundColor: getFieldsCount(clonePropertyType, cloneListingType) >= MAX_FIELDS_PER_COMBO ? T.redBg : T.greenBg,
                        color: getFieldsCount(clonePropertyType, cloneListingType) >= MAX_FIELDS_PER_COMBO ? T.red : T.green,
                        border: `1px solid ${getFieldsCount(clonePropertyType, cloneListingType) >= MAX_FIELDS_PER_COMBO ? '#FECACA' : T.greenBorder}`,
                      }}
                    >
                      <strong>{getFieldsCount(clonePropertyType, cloneListingType)}/{MAX_FIELDS_PER_COMBO}</strong> {t('customFields.fieldsInDestination')}
                    </div>
                  </div>

                  {/* Botones */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => { setShowCloneModal(false); setFieldToClone(null); }}
                      className="flex-1 py-3 rounded-xl font-bold text-sm active:scale-95 transition-transform"
                      style={{ border: `1.5px solid ${T.border}`, color: T.charcoal, backgroundColor: T.white }}
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      onClick={handleCloneField}
                      disabled={saving || getFieldsCount(clonePropertyType, cloneListingType) >= MAX_FIELDS_PER_COMBO}
                      className="flex-1 py-3 rounded-xl font-bold text-sm active:scale-95 transition-transform disabled:opacity-50"
                      style={{ background: `linear-gradient(135deg, ${T.gold} 0%, ${T.goldLight} 100%)`, color: T.navy }}
                    >
                      {saving ? t('customFields.cloning') : `🔄 ${t('customFields.clone')}`}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── EDIT MODAL ───────────────────────────────────────────────── */}
        {editingField && !showAddForm && (
          <>
            <div
              className="fixed inset-0 z-40"
              style={{ backgroundColor: 'rgba(27,45,91,0.6)', backdropFilter: 'blur(4px)' }}
              onClick={() => { setEditingField(null); setFieldName(''); setPlaceholder(''); setSelectedIcon('🏷️'); setError(null); }}
            />
            <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-md mx-auto max-h-[90vh] overflow-y-auto">
              <div className="rounded-2xl shadow-2xl overflow-hidden" style={{ backgroundColor: T.white, border: `1px solid ${T.border}` }}>
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ backgroundColor: T.navy }}>
                  <h3 className="font-bold text-base text-white">✏️ {t('customFields.editField')}</h3>
                  <button
                    onClick={() => { setEditingField(null); setFieldName(''); setPlaceholder(''); setSelectedIcon('🏷️'); setError(null); }}
                    className="w-8 h-8 flex items-center justify-center rounded-full active:scale-90 transition-transform"
                    style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: T.white }}
                  >
                    ✕
                  </button>
                </div>

                <div className="p-5">
                  <FieldForm isEdit={true} />
                </div>
              </div>
            </div>
          </>
        )}

      </div>
    </AppLayout>
  );
}