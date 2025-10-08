'use client';

interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  icon?: string;
}

export default function ErrorModal({ isOpen, onClose, title, message, icon = '⚠️' }: ErrorModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-in fade-in zoom-in duration-200">
        <div className="p-6">
          {/* Icon */}
          <div className="text-center mb-4">
            <div className="text-6xl mb-3">{icon}</div>
            <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          </div>

          {/* Message */}
          <p className="text-gray-600 text-center mb-6 leading-relaxed">
            {message}
          </p>

          {/* Button */}
          <button
            onClick={onClose}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}