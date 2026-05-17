import Link from 'next/link';
import Image from 'next/image';

export default function ProPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16" style={{ backgroundColor: '#F5EAD3' }}>

      {/* Logo */}
      <div className="mb-8">
        <Image src="/logo_header.png" alt="Flow Estate AI" width={140} height={60} className="object-contain" />
      </div>

      {/* Card principal */}
      <div className="w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">

        {/* Header de la card */}
        <div className="px-8 pt-8 pb-6 text-center" style={{ backgroundColor: '#0F172A' }}>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-4" style={{ backgroundColor: '#2563EB', color: '#FFFFFF' }}>
            🚀 PLAN PRO
          </div>
          <p className="text-4xl font-bold text-white mb-1">₡14,803</p>
          <p className="text-sm" style={{ color: '#93C5FD' }}>por mes · ~$28 USD</p>
        </div>

        {/* Cuerpo de la card */}
        <div className="px-8 py-8" style={{ backgroundColor: '#FFFFFF' }}>

          <p className="text-sm font-semibold mb-6 text-center" style={{ color: '#0F172A' }}>
            Realiza tu pago por SINPE Móvil y activa tu cuenta Pro en minutos.
          </p>

          {/* Número SINPE */}
          <div className="rounded-2xl p-5 mb-4 text-center" style={{ backgroundColor: '#F0FDF4', border: '2px solid #BBF7D0' }}>
            <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: '#166534' }}>
              💳 SINPE Móvil
            </p>
            <p className="text-3xl font-bold tracking-widest mb-1" style={{ color: '#15803D' }}>
              8368 8684
            </p>
            <p className="text-sm font-semibold" style={{ color: '#166534' }}>
              A nombre de: Steven Espinoza
            </p>
          </div>

          {/* Pasos */}
          <div className="space-y-3 mb-6">
            {[
              { step: '1', text: 'Abre tu app bancaria y realiza el SINPE al número de arriba' },
              { step: '2', text: 'Toma una captura del comprobante' },
              { step: '3', text: 'Envíanosla por WhatsApp con tu correo de Flow Estate AI' },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5" style={{ backgroundColor: '#2563EB' }}>
                  {item.step}
                </div>
                <p className="text-sm" style={{ color: '#0F172A' }}>{item.text}</p>
              </div>
            ))}
          </div>

          {/* Botón WhatsApp */}
          <a
            href="https://wa.me/50683688684?text=Hola!%20Acabo%20de%20realizar%20el%20pago%20SINPE%20para%20activar%20mi%20plan%20Pro%20en%20Flow%20Estate%20AI.%20Te%20env%C3%ADo%20el%20comprobante."
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 w-full py-4 rounded-xl font-bold text-white shadow-lg active:scale-95 transition-transform text-base"
            style={{ backgroundColor: '#25D366' }}
          >
            <svg className="w-5 h-5" fill="white" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Enviar Comprobante por WhatsApp
          </a>

          <p className="text-xs text-center mt-4 opacity-60" style={{ color: '#0F172A' }}>
            Activamos tu cuenta Pro en menos de 24 horas hábiles.
          </p>
        </div>
      </div>

      {/* Volver */}
      <div className="mt-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold hover:opacity-70 transition-opacity"
          style={{ color: '#2563EB' }}
        >
          ← Volver al inicio
        </Link>
      </div>

    </div>
  );
}