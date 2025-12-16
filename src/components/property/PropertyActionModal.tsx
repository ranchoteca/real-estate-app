'use client';

interface PropertyActionModalProps {
  isOpen: boolean;
  message: string;
  type: 'duplicating' | 'translating';
}

export default function PropertyActionModal({ isOpen, message, type }: PropertyActionModalProps) {
  if (!isOpen) return null;

  const icon = type === 'duplicating' ? '📋' : '🌐';
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse">{icon}</div>
          <p className="text-lg font-bold mb-2" style={{ color: '#0F172A' }}>
            {message}
          </p>
          <div className="flex justify-center mt-4">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          </div>
        </div>
      </div>
    </div>
  );
}