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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(27,45,91,0.7)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden"
        style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E4DC' }}
      >
        {/* Header */}
        <div
          className="px-6 pt-6 pb-5 text-center"
          style={{ backgroundColor: '#1B2D5B', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="text-5xl mb-3 animate-bounce">📤</div>
          <h2 className="text-lg font-bold text-white mb-3">
            {language === 'en' ? 'Publishing your property...' : 'Publicando tu propiedad...'}
          </h2>
          <p
            className="text-xs font-semibold px-4 py-2 rounded-xl inline-block"
            style={{ backgroundColor: 'rgba(201,168,76,0.2)', color: '#E8C96A', border: '1px solid rgba(201,168,76,0.3)' }}
          >
            ⚠️ {language === 'en' ? 'Please stay on this screen' : 'Por favor permanece en esta pantalla'}
          </p>
        </div>

        {/* Steps */}
        <div className="px-6 py-5 space-y-3" style={{ backgroundColor: '#F8F6F2' }}>
          {steps.map((step) => (
            <div key={step.id} className="flex items-center gap-3">
              {/* Ícono del paso */}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
                style={{
                  backgroundColor:
                    step.status === 'completed' ? '#15803D'
                    : step.status === 'active'    ? '#1B2D5B'
                    : step.status === 'error'     ? '#DC2626'
                    : '#E8E4DC',
                  color: step.status === 'pending' ? '#6B7280' : '#FFFFFF',
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
              <span
                className="text-sm font-semibold"
                style={{
                  color:
                    step.status === 'completed' ? '#15803D'
                    : step.status === 'active'    ? '#1B2D5B'
                    : step.status === 'error'     ? '#DC2626'
                    : '#6B7280',
                }}
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>

        {/* Video warning */}
        {hasVideos && (
          <div className="px-6 pb-5" style={{ backgroundColor: '#F8F6F2' }}>
            <div
              className="rounded-xl p-3 text-center"
              style={{ backgroundColor: '#F5EDD8', border: '1px solid rgba(201,168,76,0.35)' }}
            >
              <p className="text-xs font-semibold" style={{ color: '#1B2D5B' }}>
                🎬 {language === 'en'
                  ? 'Videos may take up to 60 seconds to process'
                  : 'Los videos pueden tardar hasta 60 segundos en procesarse'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}