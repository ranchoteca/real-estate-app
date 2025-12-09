'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import MobileLayout from '@/components/MobileLayout';
import { useTranslation } from '@/hooks/useTranslation';

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

const MAX_FIELDS_PER_COMBO = 5;

export default function CustomFieldsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t } = useTranslation();

  const [fields, setFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
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

  // Clone modal state
  const [clonePropertyType, setClonePropertyType] = useState('house');
  const [cloneListingType, setCloneListingType] = useState('sale');

  // Filter state
  const [filterPropertyType, setFilterPropertyType] = useState<string | null>(null);
  const [filterListingType, setFilterListingType] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      loadFields();
    }
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
    if (!fieldName.trim()) {
      setError('El nombre del campo es obligatorio');
      return;
    }

    if (fieldName.length > 30) {
      setError('El nombre no puede tener más de 30 caracteres');
      return;
    }

    const currentCount = fields.filter(
      f => f.property_type === selectedPropertyType && f.listing_type === selectedListingType
    ).length;

    if (currentCount >= MAX_FIELDS_PER_COMBO) {
      setError(`Máximo ${MAX_FIELDS_PER_COMBO} campos por combinación`);
      return;
    }

    setSaving(true);
    setError(null);

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

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al crear campo');
      }

      await loadFields();
      setFieldName('');
      setFieldNameEn('');
      setPlaceholder('');
      setSelectedIcon('🏷️');
      setShowAddForm(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEditField = async () => {
    if (!editingField) return;

    if (!fieldName.trim()) {
      setError('El nombre del campo es obligatorio');
      return;
    }

    if (fieldName.length > 30) {
      setError('El nombre no puede tener más de 30 caracteres');
      return;
    }

    setSaving(true);
    setError(null);

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

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al actualizar campo');
      }

      await loadFields();
      setEditingField(null);
      setFieldName('');
      setFieldNameEn('');
      setPlaceholder('');
      setSelectedIcon('🏷️');
      setShowAddForm(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCloneField = async () => {
    if (!fieldToClone) return;

    setSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/custom-fields/clone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field_id: fieldToClone.id,
          target_property_type: clonePropertyType,
          target_listing_type: cloneListingType,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al clonar campo');
      }

      await loadFields();
      setShowCloneModal(false);
      setFieldToClone(null);
      alert('✅ Campo clonado exitosamente');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
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
      const response = await fetch(`/api/custom-fields/delete/${fieldId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Error al eliminar campo');
      await loadFields();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const getFilteredFields = () => {
    return fields.filter(f => {
      if (filterPropertyType && f.property_type !== filterPropertyType) return false;
      if (filterListingType && f.listing_type !== filterListingType) return false;
      return true;
    });
  };

  const getFieldsCount = (propertyType: string, listingType: string) => {
    return fields.filter(
      f => f.property_type === propertyType && f.listing_type === listingType
    ).length;
  };

  const getTotalFieldsCount = () => fields.length;

  if (status === 'loading' || loading) {
    return (
      <MobileLayout title={t('customFields.title')} showBack={true} showTabs={true}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center py-12">
            <div className="text-5xl mb-4 animate-pulse">🏷️</div>
            <div className="text-lg" style={{ color: '#0F172A' }}>{t('common.loading')}</div>
          </div>
        </div>
      </MobileLayout>
    );
  }

  if (!session) return null;

  const filteredFields = getFilteredFields();

  return (
    <MobileLayout title={t('customFields.title')} showBack={true} showTabs={true}>
      <div className="px-4 pt-4 pb-24 space-y-4">
        {/* Info Card */}
        <div 
          className="rounded-2xl p-4 shadow-lg"
          style={{ backgroundColor: '#EFF6FF', borderLeft: '4px solid #2563EB' }}
        >
          <p className="text-sm font-semibold" style={{ color: '#1E40AF' }}>
            💡 <strong>Tip:</strong> {t('customFields.tip')}
          </p>
        </div>

        {/* Stats */}
        <div 
          className="rounded-2xl p-4 shadow-lg"
          style={{ backgroundColor: '#FFFFFF' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-70" style={{ color: '#0F172A' }}>
                {t('customFields.totalFields')}
              </p>
              <p className="text-3xl font-bold" style={{ color: '#2563EB' }}>
                {getTotalFieldsCount()}
              </p>
            </div>
            <div className="text-5xl">🏷️</div>
          </div>
        </div>

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

        {/* Add Button */}
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full rounded-2xl p-4 shadow-lg active:scale-98 transition-transform font-bold text-white"
            style={{ backgroundColor: '#2563EB' }}
          >
            ➕ {t('customFields.createNew')}
          </button>
        )}

        {/* Add/Edit Form */}
        {showAddForm && (
          <div 
            className="rounded-2xl p-5 shadow-lg space-y-4"
            style={{ backgroundColor: '#FFFFFF' }}
          >
            <h3 className="font-bold text-lg" style={{ color: '#0F172A' }}>
              {editingField ? `✏️ ${t('customFields.editField')}` : `➕ ${t('customFields.newField')}`}
            </h3>

            {!editingField && (
              <>
                <div>
                  <label className="block text-sm font-bold mb-2" style={{ color: '#0F172A' }}>
                    {t('customFields.propertyType')}
                  </label>
                  <select
                    value={selectedPropertyType}
                    onChange={(e) => setSelectedPropertyType(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none text-gray-900 font-semibold"
                    style={{ borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' }}
                  >
                    {PROPERTY_TYPES.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2" style={{ color: '#0F172A' }}>
                    {t('customFields.listingType')}
                  </label>
                  <select
                    value={selectedListingType}
                    onChange={(e) => setSelectedListingType(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none text-gray-900 font-semibold"
                    style={{ borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' }}
                  >
                    {LISTING_TYPES.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>

                <div 
                  className="px-3 py-2 rounded-lg text-sm"
                  style={{ 
                    backgroundColor: getFieldsCount(selectedPropertyType, selectedListingType) >= MAX_FIELDS_PER_COMBO 
                      ? '#FEE2E2' 
                      : '#F0FDF4',
                    color: getFieldsCount(selectedPropertyType, selectedListingType) >= MAX_FIELDS_PER_COMBO 
                      ? '#DC2626' 
                      : '#15803D'
                  }}
                >
                  <strong>{getFieldsCount(selectedPropertyType, selectedListingType)}/{MAX_FIELDS_PER_COMBO}</strong> {t('customFields.fieldsInCombo')}
                </div>
              </>
            )}

            {editingField && (
              <div 
                className="px-3 py-2 rounded-lg text-sm"
                style={{ backgroundColor: '#F0F9FF', color: '#0369A1' }}
              >
                📌 {t('customFields.editingFor')}: <strong>{PROPERTY_TYPES.find(t => t.value === editingField.property_type)?.label} → {LISTING_TYPES.find(t => t.value === editingField.listing_type)?.label}</strong>
              </div>
            )}

            <div>
              <label className="block text-sm font-bold mb-2" style={{ color: '#0F172A' }}>
                {t('customFields.fieldIcon')}
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowIconPicker(!showIconPicker)}
                  className="w-16 h-16 rounded-xl border-2 flex items-center justify-center text-3xl active:scale-95 transition-transform"
                  style={{ borderColor: '#2563EB', backgroundColor: '#EFF6FF' }}
                >
                  {selectedIcon}
                </button>
                <div className="flex-1">
                  <p className="text-sm font-semibold" style={{ color: '#0F172A' }}>
                    {t('customFields.iconSelected')}
                  </p>
                  <p className="text-xs opacity-70" style={{ color: '#0F172A' }}>
                    {t('customFields.clickToChange')}
                  </p>
                </div>
              </div>

              {showIconPicker && (
                <div 
                  className="mt-3 p-3 rounded-xl border-2 grid grid-cols-10 gap-2 max-h-48 overflow-y-auto"
                  style={{ borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' }}
                >
                  {AVAILABLE_ICONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => {
                        setSelectedIcon(icon);
                        setShowIconPicker(false);
                      }}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center text-2xl active:scale-90 transition-transform ${
                        selectedIcon === icon ? 'ring-2 ring-blue-500' : ''
                      }`}
                      style={{ 
                        backgroundColor: selectedIcon === icon ? '#DBEAFE' : '#FFFFFF',
                      }}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold mb-2" style={{ color: '#0F172A' }}>
                {t('customFields.fieldName')}
              </label>
              <input
                type="text"
                value={fieldName}
                onChange={(e) => setFieldName(e.target.value)}
                placeholder={t('customFields.fieldNamePlaceholder')}
                maxLength={30}
                className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none text-gray-900 font-semibold"
                style={{ borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' }}
              />
              <p className="text-xs mt-1 opacity-70" style={{ color: '#0F172A' }}>
                ⚠️ {t('customFields.maxChars')}
              </p>
            </div>

            <div>
              <label className="block text-sm font-bold mb-2" style={{ color: '#0F172A' }}>
                {t('customFields.fieldNameEn')}
              </label>
              <input
                type="text"
                value={fieldNameEn}
                onChange={(e) => setFieldNameEn(e.target.value)}
                placeholder={t('customFields.fieldNameEnPlaceholder')}
                maxLength={30}
                className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none text-gray-900 font-semibold"
                style={{ borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' }}
              />
              <p className="text-xs mt-1 opacity-70" style={{ color: '#0F172A' }}>
                💡 {t('customFields.bilingualTip')}
              </p>
            </div>

            <div>
                <label className="block text-sm font-bold mb-2" style={{ color: '#0F172A' }}>
                  {t('customFields.fieldType')}
                </label>
                <select
                    value={fieldType}
                    onChange={(e) => setFieldType(e.target.value as 'text' | 'number')}
                    className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none text-gray-900 font-semibold"
                    style={{ borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' }}
                >
                    <option value="text">📝 {t('customFields.text')}</option>
                    <option value="number">🔢 {t('customFields.number')}</option>
                </select>
              </div>

            <div>
              <label className="block text-sm font-bold mb-2" style={{ color: '#0F172A' }}>
                {t('customFields.placeholder')}
              </label>
              <input
                type="text"
                value={placeholder}
                onChange={(e) => setPlaceholder(e.target.value)}
                placeholder={t('customFields.placeholderText')}
                maxLength={50}
                className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none text-gray-900 font-semibold"
                style={{ borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' }}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setEditingField(null);
                  setFieldName('');
                  setFieldNameEn('');
                  setPlaceholder('');
                  setSelectedIcon('🏷️');
                  setError(null);
                }}
                className="flex-1 py-3 rounded-xl font-bold border-2 active:scale-95 transition-transform"
                style={{ 
                  borderColor: '#E5E7EB',
                  color: '#0F172A',
                  backgroundColor: '#FFFFFF'
                }}
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={editingField ? handleEditField : handleAddField}
                disabled={saving || !fieldName.trim()}
                className="flex-1 py-3 rounded-xl font-bold text-white shadow-lg active:scale-95 transition-transform disabled:opacity-50"
                style={{ backgroundColor: editingField ? '#2563EB' : '#10B981' }}
              >
                {saving ? t('customFields.saving') : (editingField ? `💾 ${t('customFields.update')}` : `✅ ${t('customFields.save')}`)}
              </button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div 
          className="rounded-2xl p-4 shadow-lg space-y-3"
          style={{ backgroundColor: '#FFFFFF' }}
        >
          <h3 className="font-bold" style={{ color: '#0F172A' }}>
            🔍 {t('customFields.filterFields')}
          </h3>
          
          <div className="grid grid-cols-2 gap-3">
            <select
              value={filterPropertyType || ''}
              onChange={(e) => setFilterPropertyType(e.target.value || null)}
              className="w-full px-3 py-2 rounded-xl border-2 focus:outline-none text-sm text-gray-900 font-semibold"
              style={{ borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' }}
            >
              <option value="">{t('customFields.allTypes')}</option>
              {PROPERTY_TYPES.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>

            <select
              value={filterListingType || ''}
              onChange={(e) => setFilterListingType(e.target.value || null)}
              className="w-full px-3 py-2 rounded-xl border-2 focus:outline-none text-sm text-gray-900 font-semibold"
              style={{ borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' }}
            >
              <option value="">{t('customFields.allStates')}</option>
              {LISTING_TYPES.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          {(filterPropertyType || filterListingType) && (
            <button
              onClick={() => {
                setFilterPropertyType(null);
                setFilterListingType(null);
              }}
              className="text-sm font-semibold underline"
              style={{ color: '#2563EB' }}
            >
              {t('customFields.clearFilters')}
            </button>
          )}
        </div>

        {/* Fields List */}
        <div className="space-y-3">
          <h3 className="font-bold px-2" style={{ color: '#0F172A' }}>
            {t('customFields.fieldsCreated')} ({filteredFields.length})
          </h3>

          {filteredFields.length === 0 ? (
            <div 
              className="rounded-2xl p-8 text-center"
              style={{ backgroundColor: '#FFFFFF' }}
            >
              <div className="text-5xl mb-3">📝</div>
              <p className="font-semibold" style={{ color: '#0F172A' }}>
                {t('customFields.noFields')}
              </p>
              <p className="text-sm opacity-70 mt-1" style={{ color: '#0F172A' }}>
                {t('customFields.createFirst')}
              </p>
            </div>
          ) : (
            filteredFields.map(field => {
              const propertyTypeLabel = PROPERTY_TYPES.find(t => t.value === field.property_type)?.label || field.property_type;
              const listingTypeLabel = LISTING_TYPES.find(t => t.value === field.listing_type)?.label || field.listing_type;

              return (
                <div 
                  key={field.id}
                  className="rounded-2xl p-4 shadow-lg"
                  style={{ backgroundColor: '#FFFFFF' }}
                >
                  <div className="flex items-start gap-3">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                      style={{ backgroundColor: '#EFF6FF' }}
                    >
                      {field.icon || '🏷️'}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-lg mb-1" style={{ color: '#0F172A' }}>
                        {field.field_name}
                      </h4>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <span 
                          className="px-2 py-1 rounded-lg text-xs font-bold"
                          style={{ backgroundColor: '#DBEAFE', color: '#1E40AF' }}
                        >
                          {propertyTypeLabel}
                        </span>
                        <span 
                          className="px-2 py-1 rounded-lg text-xs font-bold"
                          style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}
                        >
                          {listingTypeLabel}
                        </span>
                        <span 
                          className="px-2 py-1 rounded-lg text-xs font-bold"
                          style={{ backgroundColor: '#F3E8FF', color: '#6B21A8' }}
                        >
                          {field.field_type === 'text' ? '📝 Texto' : '🔢 Número'}
                        </span>
                      </div>
                      {field.placeholder && (
                        <p className="text-sm opacity-70" style={{ color: '#0F172A' }}>
                          💬 {field.placeholder}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
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
                        style={{ backgroundColor: '#DBEAFE', color: '#1E40AF' }}
                        title="Editar campo"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      
                      <button
                        onClick={() => openCloneModal(field)}
                        className="p-2 rounded-xl active:scale-90 transition-transform"
                        style={{ backgroundColor: '#F3E8FF', color: '#6B21A8' }}
                        title="Clonar campo"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>

                      <button
                        onClick={() => handleDeleteField(field.id)}
                        className="p-2 rounded-xl active:scale-90 transition-transform"
                        style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}
                        title="Eliminar campo"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Clone Modal */}
        {showCloneModal && fieldToClone && (
          <>
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 z-40"
              onClick={() => {
                setShowCloneModal(false);
                setFieldToClone(null);
              }}
            />

            <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-md mx-auto">
              <div className="rounded-2xl p-6 shadow-2xl space-y-4"
                style={{ backgroundColor: '#FFFFFF' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-lg" style={{ color: '#0F172A' }}>
                    🔄 {t('customFields.cloneField')}
                  </h3>
                  <button
                    onClick={() => {
                      setShowCloneModal(false);
                      setFieldToClone(null);
                    }}
                    className="p-2 rounded-xl active:scale-90 transition-transform"
                    style={{ backgroundColor: '#F3F4F6' }}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="#0F172A" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div 
                  className="p-3 rounded-xl"
                  style={{ backgroundColor: '#F0F9FF' }}
                >
                  <p className="text-sm font-semibold mb-1" style={{ color: '#0369A1' }}>
                    {t('customFields.fieldToClone')}:
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{fieldToClone.icon || '🏷️'}</span>
                    <span className="font-bold" style={{ color: '#0F172A' }}>
                      {fieldToClone.field_name}
                    </span>
                  </div>
                  <p className="text-xs mt-1 opacity-70" style={{ color: '#0F172A' }}>
                    {t('customFields.from')}: {PROPERTY_TYPES.find(t => t.value === fieldToClone.property_type)?.label} → {LISTING_TYPES.find(t => t.value === fieldToClone.listing_type)?.label}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2" style={{ color: '#0F172A' }}>
                    {t('customFields.cloneTo')}:
                  </label>
                  
                  <div className="space-y-3">
                    <select
                      value={clonePropertyType}
                      onChange={(e) => setClonePropertyType(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none text-gray-900 font-semibold"
                      style={{ borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' }}
                    >
                      {PROPERTY_TYPES.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>

                    <select
                      value={cloneListingType}
                      onChange={(e) => setCloneListingType(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none text-gray-900 font-semibold"
                      style={{ borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' }}
                    >
                      {LISTING_TYPES.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>

                  <div 
                    className="mt-3 px-3 py-2 rounded-lg text-sm"
                    style={{ 
                      backgroundColor: getFieldsCount(clonePropertyType, cloneListingType) >= MAX_FIELDS_PER_COMBO 
                        ? '#FEE2E2' 
                        : '#F0FDF4',
                      color: getFieldsCount(clonePropertyType, cloneListingType) >= MAX_FIELDS_PER_COMBO 
                        ? '#DC2626' 
                        : '#15803D'
                    }}
                  >
                    <strong>{getFieldsCount(clonePropertyType, cloneListingType)}/{MAX_FIELDS_PER_COMBO}</strong> {t('customFields.fieldsInDestination')}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      setShowCloneModal(false);
                      setFieldToClone(null);
                    }}
                    className="flex-1 py-3 rounded-xl font-bold border-2 active:scale-95 transition-transform"
                    style={{ 
                      borderColor: '#E5E7EB',
                      color: '#0F172A',
                      backgroundColor: '#FFFFFF'
                    }}
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={handleCloneField}
                    disabled={saving || getFieldsCount(clonePropertyType, cloneListingType) >= MAX_FIELDS_PER_COMBO}
                    className="flex-1 py-3 rounded-xl font-bold text-white shadow-lg active:scale-95 transition-transform disabled:opacity-50"
                    style={{ backgroundColor: '#8B5CF6' }}
                  >
                    {saving ? t('customFields.cloning') : `🔄 ${t('customFields.clone')}`}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Edit Modal */}
        {editingField && !showAddForm && (
          <>
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 z-40"
              onClick={() => {
                setEditingField(null);
                setFieldName('');
                setPlaceholder('');
                setSelectedIcon('🏷️');
                setError(null);
              }}
            />

            <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-md mx-auto max-h-[90vh] overflow-y-auto">
              <div 
                className="rounded-2xl p-6 shadow-2xl space-y-4"
                style={{ backgroundColor: '#FFFFFF' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-lg" style={{ color: '#0F172A' }}>
                    ✏️ {t('customFields.editField')}
                  </h3>
                  <button
                    onClick={() => {
                      setEditingField(null);
                      setFieldName('');
                      setPlaceholder('');
                      setSelectedIcon('🏷️');
                      setError(null);
                    }}
                    className="p-2 rounded-xl active:scale-90 transition-transform"
                    style={{ backgroundColor: '#F3F4F6' }}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="#0F172A" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {error && (
                  <div 
                    className="rounded-xl p-3 border-2 text-sm"
                    style={{ 
                      backgroundColor: '#FEE2E2',
                      borderColor: '#DC2626',
                      color: '#DC2626'
                    }}
                  >
                    {error}
                  </div>
                )}

                <div 
                  className="p-3 rounded-xl"
                  style={{ backgroundColor: '#F0F9FF' }}
                >
                  <p className="text-sm font-semibold mb-1" style={{ color: '#0369A1' }}>
                    {t('customFields.editingFor')}:
                  </p>
                  <p className="text-xs opacity-70" style={{ color: '#0F172A' }}>
                    {PROPERTY_TYPES.find(t => t.value === editingField.property_type)?.label} → {LISTING_TYPES.find(t => t.value === editingField.listing_type)?.label}
                  </p>
                </div>

                {/* Icono */}
                <div>
                  <label className="block text-sm font-bold mb-2" style={{ color: '#0F172A' }}>
                    {t('customFields.fieldIcon')}
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setShowIconPicker(!showIconPicker)}
                      className="w-16 h-16 rounded-xl border-2 flex items-center justify-center text-3xl active:scale-95 transition-transform"
                      style={{ borderColor: '#2563EB', backgroundColor: '#EFF6FF' }}
                    >
                      {selectedIcon}
                    </button>
                    <div className="flex-1">
                      <p className="text-sm font-semibold" style={{ color: '#0F172A' }}>
                        {t('customFields.iconSelected')}
                      </p>
                      <p className="text-xs opacity-70" style={{ color: '#0F172A' }}>
                        {t('customFields.clickToChange')}
                      </p>
                    </div>
                  </div>

                  {showIconPicker && (
                    <div 
                      className="mt-3 p-3 rounded-xl border-2 grid grid-cols-10 gap-2 max-h-48 overflow-y-auto"
                      style={{ borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' }}
                    >
                      {AVAILABLE_ICONS.map((icon) => (
                        <button
                          key={icon}
                          type="button"
                          onClick={() => {
                            setSelectedIcon(icon);
                            setShowIconPicker(false);
                          }}
                          className={`w-10 h-10 rounded-lg flex items-center justify-center text-2xl active:scale-90 transition-transform ${
                            selectedIcon === icon ? 'ring-2 ring-blue-500' : ''
                          }`}
                          style={{ 
                            backgroundColor: selectedIcon === icon ? '#DBEAFE' : '#FFFFFF',
                          }}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Nombre */}
                <div>
                  <label className="block text-sm font-bold mb-2" style={{ color: '#0F172A' }}>
                    {t('customFields.fieldName')}
                  </label>
                  <input
                    type="text"
                    value={fieldName}
                    onChange={(e) => setFieldName(e.target.value)}
                    placeholder={t('customFields.fieldNamePlaceholder')}
                    maxLength={30}
                    className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none text-gray-900 font-semibold"
                    style={{ borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' }}
                  />
                  <p className="text-xs mt-1 opacity-70" style={{ color: '#0F172A' }}>
                    {fieldName.length}/30 {t('customFields.maxChars')}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2" style={{ color: '#0F172A' }}>
                    {t('customFields.fieldNameEn')}
                  </label>
                  <input
                    type="text"
                    value={fieldNameEn}
                    onChange={(e) => setFieldNameEn(e.target.value)}
                    placeholder={t('customFields.fieldNameEnPlaceholder')}
                    maxLength={30}
                    className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none text-gray-900 font-semibold"
                    style={{ borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' }}
                  />
                </div>

                {/* Tipo */}
                <div>
                  <label className="block text-sm font-bold mb-2" style={{ color: '#0F172A' }}>
                    {t('customFields.fieldType')}
                  </label>
                  <select
                    value={fieldType}
                    onChange={(e) => setFieldType(e.target.value as 'text' | 'number')}
                    className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none text-gray-900 font-semibold"
                    style={{ borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' }}
                  >
                    <option value="text">📝 {t('customFields.text')}</option>
                    <option value="number">🔢 {t('customFields.number')}</option>
                  </select>
                </div>

                {/* Placeholder */}
                <div>
                  <label className="block text-sm font-bold mb-2" style={{ color: '#0F172A' }}>
                    {t('customFields.placeholder')}
                  </label>
                  <input
                    type="text"
                    value={placeholder}
                    onChange={(e) => setPlaceholder(e.target.value)}
                    placeholder={t('customFields.placeholderText')}
                    maxLength={50}
                    className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none text-gray-900 font-semibold"
                    style={{ borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' }}
                  />
                </div>

                {/* Botones */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      setEditingField(null);
                      setFieldName('');
                      setFieldNameEn('');
                      setPlaceholder('');
                      setSelectedIcon('🏷️');
                      setError(null);
                    }}
                    className="flex-1 py-3 rounded-xl font-bold border-2 active:scale-95 transition-transform"
                    style={{ 
                      borderColor: '#E5E7EB',
                      color: '#0F172A',
                      backgroundColor: '#FFFFFF'
                    }}
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={handleEditField}
                    disabled={saving || !fieldName.trim()}
                    className="flex-1 py-3 rounded-xl font-bold text-white shadow-lg active:scale-95 transition-transform disabled:opacity-50"
                    style={{ backgroundColor: '#2563EB' }}
                  >
                    {saving ? t('customFields.saving') : `💾 ${t('customFields.update')}`}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </MobileLayout>
  );
}