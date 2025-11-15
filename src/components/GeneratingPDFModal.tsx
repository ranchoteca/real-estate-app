'use client';

interface GeneratingPDFModalProps {
  isOpen: boolean;
}

export default function GeneratingPDFModal({ isOpen }: GeneratingPDFModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay oscuro */}
      <div 
        className="absolute inset-0"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
      />
      
      {/* Modal */}
      <div 
        className="relative rounded-3xl p-8 shadow-2xl max-w-sm mx-4 animate-scale-in"
        style={{ backgroundColor: '#FFFFFF' }}
      >
        {/* Icono animado */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            {/* Círculo de fondo pulsante */}
            <div 
              className="absolute inset-0 rounded-full animate-ping"
              style={{ 
                backgroundColor: '#2563EB',
                opacity: 0.3
              }}
            />
            
            {/* Icono principal */}
            <div 
              className="relative w-20 h-20 rounded-full flex items-center justify-center"
              style={{ backgroundColor: '#2563EB' }}
            >
              <div className="animate-bounce">
                <svg 
                  className="w-10 h-10 text-white" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" 
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Texto */}
        <h3 
          className="text-2xl font-bold text-center mb-3"
          style={{ color: '#0F172A' }}
        >
          Generando PDF
        </h3>
        
        <p 
          className="text-center text-sm opacity-70"
          style={{ color: '#0F172A' }}
        >
          Por favor espera mientras creamos tu brochure profesional...
        </p>

        {/* Barra de progreso animada */}
        <div 
          className="mt-6 h-2 rounded-full overflow-hidden"
          style={{ backgroundColor: '#E5E7EB' }}
        >
          <div 
            className="h-full rounded-full animate-progress"
            style={{ backgroundColor: '#2563EB' }}
          />
        </div>
      </div>

      <style jsx>{`
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes progress {
          0% {
            width: 0%;
          }
          50% {
            width: 70%;
          }
          100% {
            width: 100%;
          }
        }

        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }

        .animate-progress {
          animation: progress 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}