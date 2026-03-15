'use client';

interface Step {
  id: number;
  label: string;
  status: 'pending' | 'active' | 'completed' | 'error';
}

interface PublishingModalProps {
  isOpen: boolean;
  steps: Step[];
  hasVideos: boolean;
  language: 'es' | 'en';
}

export default function PublishingModal({ isOpen, steps, hasVideos, language }: PublishingModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-sm rounded-3xl shadow-2xl p-6" style={{ backgroundColor: '#FFFFFF' }}>
        
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-3 animate-bounce">📤</div>
          <h2 className="text-xl font-bold mb-1" style={{ color: '#0F172A' }}>
            {language === 'en' ? 'Publishing your property...' : 'Publicando tu propiedad...'}
          </h2>
          <p className="text-sm font-semibold px-4 py-2 rounded-xl" style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}>
            ⚠️ {language === 'en' 
              ? 'Please stay on this screen' 
              : 'Por favor permanece en esta pantalla'
            }
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-3 mb-6">
          {steps.map((step) => (
            <div key={step.id} className="flex items-center gap-3">
              {/* Icon */}
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
                style={{
                  backgroundColor: step.status === 'completed' ? '#10B981' 
                    : step.status === 'active' ? '#2563EB' 
                    : step.status === 'error' ? '#DC2626'
                    : '#E5E7EB',
                  color: step.status === 'pending' ? '#9CA3AF' : '#FFFFFF',
                }}
              >
                {step.status === 'completed' ? '✓' 
                  : step.status === 'active' ? (
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  )
                  : step.status === 'error' ? '✕'
                  : step.id
                }
              </div>

              {/* Label */}
              <span className="text-sm font-semibold"
                style={{
                  color: step.status === 'completed' ? '#10B981'
                    : step.status === 'active' ? '#2563EB'
                    : step.status === 'error' ? '#DC2626'
                    : '#9CA3AF',
                }}
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>

        {/* Video warning */}
        {hasVideos && (
          <div className="rounded-xl p-3 text-center" style={{ backgroundColor: '#EFF6FF' }}>
            <p className="text-xs font-semibold" style={{ color: '#1E40AF' }}>
              🎬 {language === 'en' 
                ? 'Videos may take up to 60 seconds to process' 
                : 'Los videos pueden tardar hasta 60 segundos en procesarse'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}