'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import AppLayout from '@/components/AppLayout';
import AttentionPropertiesModal from '@/components/AttentionPropertiesModal';
import { useTranslation } from '@/hooks/useTranslation';

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
};

interface PropertyBasic {
  id: string;
  slug: string;
  title: string;
  photos?: string[] | null;
  photosCount?: number;
  city?: string;
  state?: string;
  updated_at?: string;
}

interface AnalyticsSummary {
  inventory: { total: number; active: number; byCurrency: Record<string, number>; recentlyAdded: number };
  distribution: { byPropertyType: Record<string, number>; byListingType: Record<string, number> };
  pricing: {
    averageByCurrency: Record<string, { avg: number; min: number; max: number; symbol: string }>;
    rangesByCurrency: Record<string, Record<string, number>>;
  };
  status: {
    byStatus: Record<string, number>;
    needsAttention: {
      notUpdated30Days: number; lessThan5Photos: number; noMapLocation: number;
      propertiesNotUpdated: PropertyBasic[]; propertiesLessThan5Photos: PropertyBasic[]; propertiesNoMap: PropertyBasic[];
    };
  };
  activity: { last7Days: { created: number; updated: number; sold: number; rented: number } };
  locations: { topLocations: Array<{ location: string; count: number }> };
  views: { total: number; average: number; threshold: number };
}

type ModalType = 'lessThan5Photos' | 'noMapLocation' | 'notUpdated30Days' | null;

const STATUS_CONFIG: Record<string, { label_es: string; label_en: string; color: string; emoji: string }> = {
  active:  { label_es: 'Disponible', label_en: 'Available', color: '#15803D', emoji: '✅' },
  pending: { label_es: 'Pendiente',  label_en: 'Pending',   color: '#C9A84C', emoji: '⏳' },
  sold:    { label_es: 'Vendida',    label_en: 'Sold',       color: '#6B7280', emoji: '✔️' },
  rented:  { label_es: 'Alquilada', label_en: 'Rented',     color: '#1B2D5B', emoji: '🏠' },
};

export default function AnalyticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [lang, setLang] = useState<'es' | 'en'>('es');

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
    else if (status === 'authenticated') {
      loadAnalytics();
      // Detectar idioma del agente
      fetch('/api/user/language').then(r => r.json()).then(d => { if (d.language) setLang(d.language); }).catch(() => {});
    }
  }, [status, router]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/analytics/summary');
      if (response.ok) { const data = await response.json(); setSummary(data.summary); }
    } catch (error) { console.error('Error loading analytics:', error); }
    finally { setLoading(false); }
  };

  const formatPrice = (price: number) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(price);
  const getPercentage = (value: number, total: number) => total > 0 ? Math.round((value / total) * 100) : 0;
  const getModalProperties = (): PropertyBasic[] => {
    if (!summary || !modalType) return [];
    switch (modalType) {
      case 'lessThan5Photos': return summary.status.needsAttention.propertiesLessThan5Photos || [];
      case 'noMapLocation':   return summary.status.needsAttention.propertiesNoMap || [];
      case 'notUpdated30Days':return summary.status.needsAttention.propertiesNotUpdated || [];
      default: return [];
    }
  };

  // ── Card wrapper ──────────────────────────────────────────────────────────
  const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <div
      className={`rounded-2xl p-5 shadow-sm ${className}`}
      style={{ backgroundColor: T.white, border: `1px solid ${T.border}` }}
    >
      {children}
    </div>
  );

  // ── Section title ─────────────────────────────────────────────────────────
  const SectionTitle = ({ emoji, label }: { emoji: string; label: string }) => (
    <h2 className="text-base font-bold mb-4 flex items-center gap-2" style={{ color: T.navy }}>
      <span>{emoji}</span>
      <span>{label}</span>
    </h2>
  );

  // ── Bar ───────────────────────────────────────────────────────────────────
  const Bar = ({ pct, color = T.navy }: { pct: number; color?: string }) => (
    <div className="w-full h-1.5 rounded-full" style={{ backgroundColor: T.border }}>
      <div className="h-full rounded-full transition-all" style={{ backgroundColor: color, width: `${pct}%` }} />
    </div>
  );

  if (loading) {
    return (
      <AppLayout title={t('analytics.title')} showTabs={true}>
        <div className="flex items-center justify-center h-full" style={{ backgroundColor: T.cream }}>
          <div className="text-center py-12">
            <div className="text-5xl mb-4 animate-pulse">📊</div>
            <div className="text-base font-medium" style={{ color: T.muted }}>{t('analytics.loading')}</div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!summary) {
    return (
      <AppLayout title={t('analytics.title')} showTabs={true}>
        <div className="flex items-center justify-center h-full px-6" style={{ backgroundColor: T.cream }}>
          <div className="text-center">
            <div className="text-5xl mb-4">📊</div>
            <h2 className="text-xl font-bold mb-2" style={{ color: T.navy }}>{t('analytics.noData')}</h2>
            <p className="text-sm mb-6" style={{ color: T.muted }}>{t('analytics.noDataDesc')}</p>
            <button
              onClick={() => router.push('/create-property')}
              className="px-6 py-3 rounded-xl font-bold text-sm active:scale-95 transition-transform"
              style={{ background: `linear-gradient(135deg, ${T.gold} 0%, ${T.goldLight} 100%)`, color: T.navy }}
            >
              ➕ {t('analytics.createProperty')}
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const viewsProgress = Math.min((summary.views.total / summary.views.threshold) * 100, 100);

  return (
    <AppLayout title={t('analytics.title')} showTabs={true}>
      <div className="px-4 py-4 pb-24 md:px-6 md:py-6 md:pb-8" style={{ backgroundColor: T.cream }}>

        {/* Título estilizado — solo mobile */}
        <div className="flex items-center gap-2 mb-4 md:hidden">
          <div style={{ width: '3px', height: '22px', backgroundColor: T.gold, borderRadius: '2px', flexShrink: 0 }} />
          <h1 className="text-xl font-bold tracking-tight" style={{ color: T.navy }}>
            {t('analytics.title')}
          </h1>
        </div>

        {/* Grid responsive */}
        <div className="space-y-3 md:space-y-0 md:grid md:grid-cols-2 md:gap-4 lg:grid-cols-3">

          {/* 1. INVENTARIO */}
          <Card>
            <SectionTitle emoji="📊" label={t('analytics.inventory')} />
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: T.muted }}>{t('analytics.totalProperties')}</p>
                <p className="text-3xl font-bold" style={{ color: T.navy }}>{summary.inventory.total}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: T.muted }}>{t('analytics.active')}</p>
                <p className="text-3xl font-bold" style={{ color: '#15803D' }}>{summary.inventory.active}</p>
              </div>
            </div>
            {Object.keys(summary.inventory.byCurrency).length > 0 && (
              <div className="pt-3 border-t" style={{ borderColor: T.border }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: T.muted }}>{t('analytics.byCurrency')}</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(summary.inventory.byCurrency).map(([currency, count]) => (
                    <div key={currency} className="px-2.5 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: T.goldPale, color: T.navy, border: `1px solid rgba(201,168,76,0.35)` }}>
                      {count} en {currency}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {summary.inventory.recentlyAdded > 0 && (
              <div className="mt-3 px-3 py-2 rounded-xl text-xs font-semibold" style={{ backgroundColor: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0' }}>
                ✨ {summary.inventory.recentlyAdded} {summary.inventory.recentlyAdded === 1 ? t('analytics.recentlyAdded') : t('analytics.recentlyAddedPlural')} {t('analytics.thisWeek')}
              </div>
            )}
          </Card>

          {/* 2. DISTRIBUCIÓN */}
          <Card>
            <SectionTitle emoji="🏘️" label={t('analytics.distribution')} />
            <div className="space-y-3 mb-4">
              {Object.entries(summary.distribution.byPropertyType).map(([type, count]) => {
                const pct = getPercentage(count, summary.inventory.total);
                return (
                  <div key={type}>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-sm font-semibold" style={{ color: T.charcoal }}>{t(`analytics.propertyTypes.${type}`)}</span>
                      <span className="text-xs font-bold" style={{ color: T.navy }}>{count} ({pct}%)</span>
                    </div>
                    <Bar pct={pct} color={T.navy} />
                  </div>
                );
              })}
            </div>
            <div className="pt-3 border-t" style={{ borderColor: T.border }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: T.muted }}>{t('analytics.byListingType')}</p>
              <div className="flex gap-2">
                {Object.entries(summary.distribution.byListingType).map(([type, count]) => (
                  <div
                    key={type}
                    className="flex-1 px-3 py-2.5 rounded-xl text-center"
                    style={{
                      backgroundColor: type === 'sale' ? '#F0FDF4' : '#FFFBEB',
                      border: `1px solid ${type === 'sale' ? '#BBF7D0' : '#FDE68A'}`,
                    }}
                  >
                    <p className="text-2xl font-bold" style={{ color: type === 'sale' ? '#15803D' : '#B45309' }}>{count}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: type === 'sale' ? '#15803D' : '#B45309' }}>
                      {type === 'sale' ? t('analytics.sale') : t('analytics.rent')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* 3. PRECIOS */}
          {Object.keys(summary.pricing.averageByCurrency).length > 0 && (
            <Card>
              <SectionTitle emoji="💰" label={t('analytics.pricing')} />
              {Object.entries(summary.pricing.averageByCurrency).map(([currency, data]) => (
                <div key={currency} className="mb-4 last:mb-0">
                  <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: T.muted }}>{currency}</p>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {[
                      { label: t('analytics.average'), value: data.avg, color: T.navy },
                      { label: t('analytics.minimum'), value: data.min, color: '#15803D' },
                      { label: t('analytics.maximum'), value: data.max, color: '#B45309' },
                    ].map(item => (
                      <div key={item.label} className="px-2 py-2 rounded-xl" style={{ backgroundColor: T.cream }}>
                        <p className="text-[9px] font-semibold uppercase tracking-wider mb-1" style={{ color: T.muted }}>{item.label}</p>
                        <p className="text-sm font-bold" style={{ color: item.color }}>{data.symbol}{formatPrice(item.value)}</p>
                      </div>
                    ))}
                  </div>
                  {summary.pricing.rangesByCurrency[currency] && (
                    <div className="space-y-2">
                      {Object.entries(summary.pricing.rangesByCurrency[currency]).map(([range, count]) => (
                        <div key={range} className="flex items-center gap-2">
                          <span className="text-xs w-24 flex-shrink-0" style={{ color: T.muted }}>{range}</span>
                          <div className="flex-1">
                            <Bar pct={getPercentage(count, summary.inventory.byCurrency[currency] || summary.inventory.total)} color={T.navy} />
                          </div>
                          <span className="text-xs font-bold w-5 text-right" style={{ color: T.navy }}>{count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </Card>
          )}

          {/* 4. ESTADO */}
          <Card>
            <SectionTitle emoji="📌" label={t('analytics.propertyStatus')} />
            <div className="grid grid-cols-2 gap-2 mb-4">
              {Object.entries(summary.status.byStatus).map(([status, count]) => {
                const cfg = STATUS_CONFIG[status] || { label_es: status, label_en: status, color: T.muted, emoji: '●' };
                return (
                  <div
                    key={status}
                    className="px-3 py-3 rounded-xl"
                    style={{ backgroundColor: `${cfg.color}0D`, border: `1px solid ${cfg.color}25` }}
                  >
                    <p className="text-xl mb-1">{cfg.emoji}</p>
                    <p className="text-2xl font-bold" style={{ color: cfg.color }}>{count}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: cfg.color }}>
                      {lang === 'en' ? cfg.label_en : cfg.label_es}
                    </p>
                  </div>
                );
              })}
            </div>

            {(summary.status.needsAttention.notUpdated30Days > 0 || summary.status.needsAttention.lessThan5Photos > 0 || summary.status.needsAttention.noMapLocation > 0) && (
              <div className="pt-3 border-t" style={{ borderColor: T.border }}>
                <p className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: '#DC2626' }}>
                  ⚠️ {t('analytics.needsAttention')}
                </p>
                <div className="space-y-2">
                  {[
                    { key: 'notUpdated30Days', count: summary.status.needsAttention.notUpdated30Days, label: t('analytics.notUpdated30Days'), color: '#DC2626', bg: '#FEE2E2', icon: '📅' },
                    { key: 'lessThan5Photos',  count: summary.status.needsAttention.lessThan5Photos,  label: t('analytics.lessThan5Photos'),  color: '#B45309', bg: '#FEF3C7', icon: '📸' },
                    { key: 'noMapLocation',    count: summary.status.needsAttention.noMapLocation,    label: t('analytics.noMapLocation'),    color: '#1B2D5B', bg: '#EEF2FF', icon: '📍' },
                  ].filter(item => item.count > 0).map(item => (
                    <button
                      key={item.key}
                      onClick={() => setModalType(item.key as ModalType)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl active:scale-98 transition-all"
                      style={{ backgroundColor: item.bg, border: `1px solid ${item.color}25` }}
                    >
                      <span className="text-base flex-shrink-0">{item.icon}</span>
                      <span className="flex-1 text-left text-xs font-semibold" style={{ color: item.color }}>{item.label}</span>
                      <span className="text-sm font-bold px-2 py-0.5 rounded-lg text-white flex-shrink-0" style={{ backgroundColor: item.color }}>
                        {item.count}
                      </span>
                      <span className="text-base flex-shrink-0" style={{ color: item.color }}>›</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* 5. ACTIVIDAD */}
          <Card>
            <SectionTitle emoji="📅" label={t('analytics.recentActivity')} />
            <div className="grid grid-cols-2 gap-2 mb-4">
              {[
                { emoji: '➕', count: summary.activity.last7Days.created,  label: t('analytics.created'), bg: '#EEF2FF', color: T.navy },
                { emoji: '✏️', count: summary.activity.last7Days.updated,  label: t('analytics.edited'),  bg: '#F0FDF4', color: '#15803D' },
                ...(summary.activity.last7Days.sold > 0    ? [{ emoji: '✔️', count: summary.activity.last7Days.sold,    label: t('analytics.sold'),    bg: T.cream,   color: T.muted }] : []),
                ...(summary.activity.last7Days.rented > 0  ? [{ emoji: '🏠', count: summary.activity.last7Days.rented,  label: t('analytics.rented'),  bg: '#EEF2FF', color: T.navy  }] : []),
              ].map((item, i) => (
                <div key={i} className="px-3 py-3 rounded-xl" style={{ backgroundColor: item.bg, border: `1px solid ${T.border}` }}>
                  <p className="text-xl mb-1">{item.emoji}</p>
                  <p className="text-2xl font-bold" style={{ color: item.color }}>{item.count}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: item.color }}>{item.label}</p>
                </div>
              ))}
            </div>
            {summary.locations.topLocations.length > 0 && (
              <div className="pt-3 border-t" style={{ borderColor: T.border }}>
                <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: T.muted }}>📍 {t('analytics.topLocations')}</p>
                <div className="space-y-2">
                  {summary.locations.topLocations.map((loc, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm" style={{ color: T.charcoal }}>{loc.location}</span>
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: T.goldPale, color: T.navy, border: `1px solid rgba(201,168,76,0.35)` }}
                      >
                        {loc.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* 6. VISTAS */}
          <Card>
            <div className="text-center">
              <div className="text-5xl mb-3">{summary.views.total >= summary.views.threshold ? '🎉' : '🔒'}</div>
              <h2 className="text-base font-bold mb-2" style={{ color: T.navy }}>
                {summary.views.total >= summary.views.threshold ? t('analytics.viewsUnlocked') : t('analytics.propertyPerformance')}
              </h2>
              {summary.views.total >= summary.views.threshold ? (
                <div>
                  <p className="text-xs mb-4" style={{ color: T.muted }}>
                    {t('analytics.totalViewsReached').replace('{count}', summary.views.total.toString())}
                  </p>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="px-3 py-3 rounded-xl" style={{ backgroundColor: T.goldPale, border: `1px solid rgba(201,168,76,0.35)` }}>
                      <p className="text-2xl font-bold" style={{ color: T.navy }}>{summary.views.total}</p>
                      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: T.muted }}>{t('analytics.totalViews')}</p>
                    </div>
                    <div className="px-3 py-3 rounded-xl" style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                      <p className="text-2xl font-bold" style={{ color: '#15803D' }}>{summary.views.average}</p>
                      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#15803D' }}>{t('analytics.averageViews')}</p>
                    </div>
                  </div>
                  <p className="text-xs opacity-50" style={{ color: T.muted }}>💡 {t('analytics.comingSoon')}</p>
                </div>
              ) : (
                <div>
                  <p className="text-xs mb-4" style={{ color: T.muted }}>{t('analytics.unlockViews')}</p>
                  <div className="mb-4">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span style={{ color: T.muted }}>{t('analytics.progress')}</span>
                      <span className="font-bold" style={{ color: T.navy }}>{summary.views.total} / {summary.views.threshold}</span>
                    </div>
                    <div className="w-full h-2 rounded-full" style={{ backgroundColor: T.border }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ background: `linear-gradient(90deg, ${T.navy} 0%, ${T.gold} 100%)`, width: `${viewsProgress}%` }}
                      />
                    </div>
                  </div>
                  <div className="px-3 py-3 rounded-xl text-left" style={{ backgroundColor: T.goldPale, border: `1px solid rgba(201,168,76,0.35)` }}>
                    <p className="text-xs font-semibold mb-2" style={{ color: T.navy }}>💡 {t('analytics.shareYourProperties')}</p>
                    <div className="space-y-0.5 text-xs" style={{ color: T.navy, opacity: 0.7 }}>
                      <p>• Facebook</p><p>• Instagram</p><p>• WhatsApp</p><p>• Email</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>

        </div>
      </div>

      {modalType && (
        <AttentionPropertiesModal
          isOpen={!!modalType}
          onClose={() => setModalType(null)}
          type={modalType}
          properties={getModalProperties()}
        />
      )}
    </AppLayout>
  );
}