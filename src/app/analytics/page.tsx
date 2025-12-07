'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import MobileLayout from '@/components/MobileLayout';
import AttentionPropertiesModal from '@/components/AttentionPropertiesModal';
import { useTranslation } from '@/hooks/useTranslation';

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

export default function AnalyticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [modalType, setModalType] = useState<ModalType>(null);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
    else if (status === 'authenticated') loadAnalytics();
  }, [status, router]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/analytics/summary');
      if (response.ok) {
        const data = await response.json();
        setSummary(data.summary);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(price);
  const getPercentage = (value: number, total: number) => total > 0 ? Math.round((value / total) * 100) : 0;
  const getModalProperties = (): PropertyBasic[] => {
    if (!summary || !modalType) return [];
    switch (modalType) {
      case 'lessThan5Photos': return summary.status.needsAttention.propertiesLessThan5Photos || [];
      case 'noMapLocation': return summary.status.needsAttention.propertiesNoMap || [];
      case 'notUpdated30Days': return summary.status.needsAttention.propertiesNotUpdated || [];
      default: return [];
    }
  };

  const STATUS_LABELS: Record<string, { label: string; color: string; emoji: string }> = {
    active: { label: t('analytics.statusActive'), color: '#10B981', emoji: '✅' },
    pending: { label: t('analytics.statusPending'), color: '#F59E0B', emoji: '⏳' },
    sold: { label: t('analytics.statusSold'), color: '#6B7280', emoji: '✔️' },
    rented: { label: t('analytics.statusRented'), color: '#3B82F6', emoji: '🏠' },
  };

  if (loading) {
    return (
      <MobileLayout title={t('analytics.title')} showTabs={true}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center py-12">
            <div className="text-5xl mb-4 animate-pulse">📊</div>
            <div className="text-lg" style={{ color: '#0F172A' }}>{t('analytics.loading')}</div>
          </div>
        </div>
      </MobileLayout>
    );
  }

  if (!summary) {
    return (
      <MobileLayout title={t('analytics.title')} showTabs={true}>
        <div className="flex items-center justify-center h-full px-6">
          <div className="text-center">
            <div className="text-5xl mb-4">📊</div>
            <h2 className="text-xl font-bold mb-2" style={{ color: '#0F172A' }}>{t('analytics.noData')}</h2>
            <p className="text-sm opacity-70 mb-6" style={{ color: '#0F172A' }}>{t('analytics.noDataDesc')}</p>
            <button onClick={() => router.push('/create-property')} className="px-6 py-3 rounded-xl font-bold text-white shadow-lg" style={{ backgroundColor: '#2563EB' }}>
              ➕ {t('analytics.createProperty')}
            </button>
          </div>
        </div>
      </MobileLayout>
    );
  }

  const viewsProgress = Math.min((summary.views.total / summary.views.threshold) * 100, 100);

  return (
    <MobileLayout title={t('analytics.title')} showTabs={true}>
      <div className="px-4 py-6 space-y-4">
        
        {/* 1. INVENTARIO */}
        <div className="rounded-2xl p-5 shadow-lg" style={{ backgroundColor: '#FFFFFF' }}>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: '#0F172A' }}>
            <span>📊</span> {t('analytics.inventory')}
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm opacity-70" style={{ color: '#0F172A' }}>{t('analytics.totalProperties')}</p>
              <p className="text-3xl font-bold" style={{ color: '#2563EB' }}>{summary.inventory.total}</p>
            </div>
            <div>
              <p className="text-sm opacity-70" style={{ color: '#0F172A' }}>{t('analytics.active')}</p>
              <p className="text-3xl font-bold" style={{ color: '#10B981' }}>{summary.inventory.active}</p>
            </div>
          </div>
          {Object.keys(summary.inventory.byCurrency).length > 0 && (
            <div className="mt-4 pt-4 border-t" style={{ borderColor: '#E5E7EB' }}>
              <p className="text-sm font-semibold mb-2" style={{ color: '#0F172A' }}>{t('analytics.byCurrency')}:</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(summary.inventory.byCurrency).map(([currency, count]) => (
                  <div key={currency} className="px-3 py-1 rounded-full text-sm font-bold" style={{ backgroundColor: '#EFF6FF', color: '#1E40AF' }}>
                    {count} en {currency}
                  </div>
                ))}
              </div>
            </div>
          )}
          {summary.inventory.recentlyAdded > 0 && (
            <div className="mt-3 px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: '#D1FAE5', color: '#065F46' }}>
              ✨ {summary.inventory.recentlyAdded} {summary.inventory.recentlyAdded === 1 ? t('analytics.recentlyAdded') : t('analytics.recentlyAddedPlural')} {t('analytics.thisWeek')}
            </div>
          )}
        </div>

        {/* 2. DISTRIBUCIÓN */}
        <div className="rounded-2xl p-5 shadow-lg" style={{ backgroundColor: '#FFFFFF' }}>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: '#0F172A' }}>
            <span>🏘️</span> {t('analytics.distribution')}
          </h2>
          <div className="space-y-3">
            {Object.entries(summary.distribution.byPropertyType).map(([type, count]) => {
              const percentage = getPercentage(count, summary.inventory.total);
              return (
                <div key={type}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-semibold" style={{ color: '#0F172A' }}>{t(`analytics.propertyTypes.${type}`)}</span>
                    <span className="text-sm font-bold" style={{ color: '#2563EB' }}>{count} ({percentage}%)</span>
                  </div>
                  <div className="w-full h-2 rounded-full" style={{ backgroundColor: '#E5E7EB' }}>
                    <div className="h-full rounded-full transition-all" style={{ backgroundColor: '#2563EB', width: `${percentage}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t" style={{ borderColor: '#E5E7EB' }}>
            <p className="text-sm font-semibold mb-2" style={{ color: '#0F172A' }}>{t('analytics.byListingType')}:</p>
            <div className="flex gap-2">
              {Object.entries(summary.distribution.byListingType).map(([type, count]) => (
                <div key={type} className="flex-1 px-3 py-2 rounded-lg text-center" style={{
                  backgroundColor: type === 'sale' ? '#D1FAE5' : '#FEF3C7',
                  color: type === 'sale' ? '#065F46' : '#92400E'
                }}>
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-xs font-semibold">{type === 'sale' ? t('analytics.sale') : t('analytics.rent')}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 3. PRECIOS */}
        {Object.keys(summary.pricing.averageByCurrency).length > 0 && (
          <div className="rounded-2xl p-5 shadow-lg" style={{ backgroundColor: '#FFFFFF' }}>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: '#0F172A' }}>
              <span>💰</span> {t('analytics.pricing')}
            </h2>
            {Object.entries(summary.pricing.averageByCurrency).map(([currency, data]) => (
              <div key={currency} className="mb-4 last:mb-0">
                <p className="text-sm font-semibold mb-2" style={{ color: '#0F172A' }}>{currency}:</p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="px-3 py-2 rounded-lg" style={{ backgroundColor: '#F9FAFB' }}>
                    <p className="text-xs opacity-70" style={{ color: '#0F172A' }}>{t('analytics.average')}</p>
                    <p className="text-sm font-bold" style={{ color: '#2563EB' }}>{data.symbol}{formatPrice(data.avg)}</p>
                  </div>
                  <div className="px-3 py-2 rounded-lg" style={{ backgroundColor: '#F9FAFB' }}>
                    <p className="text-xs opacity-70" style={{ color: '#0F172A' }}>{t('analytics.minimum')}</p>
                    <p className="text-sm font-bold" style={{ color: '#10B981' }}>{data.symbol}{formatPrice(data.min)}</p>
                  </div>
                  <div className="px-3 py-2 rounded-lg" style={{ backgroundColor: '#F9FAFB' }}>
                    <p className="text-xs opacity-70" style={{ color: '#0F172A' }}>{t('analytics.maximum')}</p>
                    <p className="text-sm font-bold" style={{ color: '#F59E0B' }}>{data.symbol}{formatPrice(data.max)}</p>
                  </div>
                </div>
                {summary.pricing.rangesByCurrency[currency] && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-semibold opacity-70" style={{ color: '#0F172A' }}>{t('analytics.distributionRange')}:</p>
                    {Object.entries(summary.pricing.rangesByCurrency[currency]).map(([range, count]) => (
                      <div key={range} className="flex items-center gap-2">
                        <span className="text-xs w-24" style={{ color: '#0F172A' }}>{range}</span>
                        <div className="flex-1 h-2 rounded-full" style={{ backgroundColor: '#E5E7EB' }}>
                          <div className="h-full rounded-full" style={{ backgroundColor: '#2563EB', width: `${getPercentage(count, summary.inventory.byCurrency[currency] || summary.inventory.total)}%` }} />
                        </div>
                        <span className="text-xs font-bold w-8 text-right" style={{ color: '#2563EB' }}>{count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 4. ESTADO */}
        <div className="rounded-2xl p-5 shadow-lg" style={{ backgroundColor: '#FFFFFF' }}>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: '#0F172A' }}>
            <span>📌</span> {t('analytics.propertyStatus')}
          </h2>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {Object.entries(summary.status.byStatus).map(([status, count]) => {
              const statusInfo = STATUS_LABELS[status] || { label: status, color: '#6B7280', emoji: '●' };
              return (
                <div key={status} className="px-4 py-3 rounded-xl" style={{ backgroundColor: `${statusInfo.color}10` }}>
                  <p className="text-2xl mb-1">{statusInfo.emoji}</p>
                  <p className="text-2xl font-bold" style={{ color: statusInfo.color }}>{count}</p>
                  <p className="text-xs font-semibold" style={{ color: statusInfo.color }}>{statusInfo.label}</p>
                </div>
              );
            })}
          </div>
          {(summary.status.needsAttention.notUpdated30Days > 0 || summary.status.needsAttention.lessThan5Photos > 0 || summary.status.needsAttention.noMapLocation > 0) && (
            <div className="pt-4 border-t" style={{ borderColor: '#E5E7EB' }}>
              <p className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: '#DC2626' }}>
                ⚠️ {t('analytics.needsAttention')}:
              </p>
              <div className="space-y-2">
                {summary.status.needsAttention.notUpdated30Days > 0 && (
                  <button onClick={() => setModalType('notUpdated30Days')} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg active:scale-98 transition-all shadow-sm hover:shadow-md" style={{ backgroundColor: '#FEE2E2' }}>
                    <div className="flex items-center justify-center w-10 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: '#FCA5A5' }}><span className="text-lg">📅</span></div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-semibold" style={{ color: '#991B1B' }}>{t('analytics.notUpdated30Days')}</p>
                      <p className="text-xs opacity-70" style={{ color: '#991B1B' }}>{t('analytics.tapToSeeList')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold px-2 py-1 rounded" style={{ backgroundColor: '#DC2626', color: '#FFFFFF' }}>{summary.status.needsAttention.notUpdated30Days}</span>
                      <span className="text-xl" style={{ color: '#DC2626' }}>›</span>
                    </div>
                  </button>
                )}
                {summary.status.needsAttention.lessThan5Photos > 0 && (
                  <button onClick={() => setModalType('lessThan5Photos')} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg active:scale-98 transition-all shadow-sm hover:shadow-md" style={{ backgroundColor: '#FEF3C7' }}>
                    <div className="flex items-center justify-center w-10 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: '#FCD34D' }}><span className="text-lg">📸</span></div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-semibold" style={{ color: '#78350F' }}>{t('analytics.lessThan5Photos')}</p>
                      <p className="text-xs opacity-70" style={{ color: '#78350F' }}>{t('analytics.tapToSeeList')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold px-2 py-1 rounded" style={{ backgroundColor: '#F59E0B', color: '#FFFFFF' }}>{summary.status.needsAttention.lessThan5Photos}</span>
                      <span className="text-xl" style={{ color: '#F59E0B' }}>›</span>
                    </div>
                  </button>
                )}
                {summary.status.needsAttention.noMapLocation > 0 && (
                  <button onClick={() => setModalType('noMapLocation')} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg active:scale-98 transition-all shadow-sm hover:shadow-md" style={{ backgroundColor: '#DBEAFE' }}>
                    <div className="flex items-center justify-center w-10 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: '#93C5FD' }}><span className="text-lg">📍</span></div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-semibold" style={{ color: '#1E40AF' }}>{t('analytics.noMapLocation')}</p>
                      <p className="text-xs opacity-70" style={{ color: '#1E40AF' }}>{t('analytics.tapToSeeList')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold px-2 py-1 rounded" style={{ backgroundColor: '#2563EB', color: '#FFFFFF' }}>{summary.status.needsAttention.noMapLocation}</span>
                      <span className="text-xl" style={{ color: '#2563EB' }}>›</span>
                    </div>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 5. ACTIVIDAD */}
        <div className="rounded-2xl p-5 shadow-lg" style={{ backgroundColor: '#FFFFFF' }}>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: '#0F172A' }}>
            <span>📅</span> {t('analytics.recentActivity')}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="px-4 py-3 rounded-xl" style={{ backgroundColor: '#EFF6FF' }}>
              <p className="text-2xl mb-1">➕</p>
              <p className="text-2xl font-bold" style={{ color: '#2563EB' }}>{summary.activity.last7Days.created}</p>
              <p className="text-xs font-semibold" style={{ color: '#1E40AF' }}>{t('analytics.created')}</p>
            </div>
            <div className="px-4 py-3 rounded-xl" style={{ backgroundColor: '#F0FDF4' }}>
              <p className="text-2xl mb-1">✏️</p>
              <p className="text-2xl font-bold" style={{ color: '#10B981' }}>{summary.activity.last7Days.updated}</p>
              <p className="text-xs font-semibold" style={{ color: '#065F46' }}>{t('analytics.edited')}</p>
            </div>
            {summary.activity.last7Days.sold > 0 && (
              <div className="px-4 py-3 rounded-xl" style={{ backgroundColor: '#F3F4F6' }}>
                <p className="text-2xl mb-1">✔️</p>
                <p className="text-2xl font-bold" style={{ color: '#6B7280' }}>{summary.activity.last7Days.sold}</p>
                <p className="text-xs font-semibold" style={{ color: '#374151' }}>{t('analytics.sold')}</p>
              </div>
            )}
            {summary.activity.last7Days.rented > 0 && (
              <div className="px-4 py-3 rounded-xl" style={{ backgroundColor: '#EFF6FF' }}>
                <p className="text-2xl mb-1">🏠</p>
                <p className="text-2xl font-bold" style={{ color: '#3B82F6' }}>{summary.activity.last7Days.rented}</p>
                <p className="text-xs font-semibold" style={{ color: '#1E40AF' }}>{t('analytics.rented')}</p>
              </div>
            )}
          </div>
          {summary.locations.topLocations.length > 0 && (
            <div className="mt-4 pt-4 border-t" style={{ borderColor: '#E5E7EB' }}>
              <p className="text-sm font-semibold mb-3" style={{ color: '#0F172A' }}>📍 {t('analytics.topLocations')}:</p>
              <div className="space-y-2">
                {summary.locations.topLocations.map((loc, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: '#0F172A' }}>{loc.location}</span>
                    <span className="text-sm font-bold px-2 py-1 rounded" style={{ backgroundColor: '#EFF6FF', color: '#2563EB' }}>{loc.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 6. VISTAS */}
        <div className="rounded-2xl p-5 shadow-lg" style={{ backgroundColor: '#FFFFFF', border: '2px dashed #E5E7EB' }}>
          <div className="text-center">
            <div className="text-5xl mb-3">{summary.views.total >= summary.views.threshold ? '🎉' : '🔒'}</div>
            <h2 className="text-lg font-bold mb-2" style={{ color: '#0F172A' }}>
              {summary.views.total >= summary.views.threshold ? t('analytics.viewsUnlocked') : t('analytics.propertyPerformance')}
            </h2>
            {summary.views.total >= summary.views.threshold ? (
              <div>
                <p className="text-sm mb-4 opacity-70" style={{ color: '#0F172A' }}>{t('analytics.totalViewsReached').replace('{count}', summary.views.total.toString())}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="px-4 py-3 rounded-xl" style={{ backgroundColor: '#EFF6FF' }}>
                    <p className="text-2xl font-bold" style={{ color: '#2563EB' }}>{summary.views.total}</p>
                    <p className="text-xs font-semibold" style={{ color: '#1E40AF' }}>{t('analytics.totalViews')}</p>
                  </div>
                  <div className="px-4 py-3 rounded-xl" style={{ backgroundColor: '#F0FDF4' }}>
                    <p className="text-2xl font-bold" style={{ color: '#10B981' }}>{summary.views.average}</p>
                    <p className="text-xs font-semibold" style={{ color: '#065F46' }}>{t('analytics.averageViews')}</p>
                  </div>
                </div>
                <p className="text-xs mt-4 opacity-60" style={{ color: '#0F172A' }}>💡 {t('analytics.comingSoon')}</p>
              </div>
            ) : (
              <div>
                <p className="text-sm mb-4 opacity-70" style={{ color: '#0F172A' }}>{t('analytics.unlockViews')}</p>
                <div className="mb-4">
                  <div className="flex justify-between text-xs mb-1" style={{ color: '#0F172A' }}>
                    <span>{t('analytics.progress')}</span>
                    <span className="font-bold">{summary.views.total} / {summary.views.threshold}</span>
                  </div>
                  <div className="w-full h-3 rounded-full" style={{ backgroundColor: '#E5E7EB' }}>
                    <div className="h-full rounded-full transition-all" style={{ backgroundColor: '#2563EB', width: `${viewsProgress}%` }} />
                  </div>
                </div>
                <div className="px-4 py-3 rounded-xl text-left" style={{ backgroundColor: '#EFF6FF' }}>
                  <p className="text-xs font-semibold mb-2" style={{ color: '#1E40AF' }}>💡 {t('analytics.shareYourProperties')}:</p>
                  <div className="space-y-1 text-xs" style={{ color: '#1E40AF' }}>
                    <p>• Facebook</p><p>• Instagram</p><p>• WhatsApp</p><p>• Email</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {modalType && <AttentionPropertiesModal isOpen={!!modalType} onClose={() => setModalType(null)} type={modalType} properties={getModalProperties()} />}
    </MobileLayout>
  );
}