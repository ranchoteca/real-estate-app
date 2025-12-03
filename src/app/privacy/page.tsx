import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5EAD3' }}>
      {/* Header */}
      <header className="sticky top-0 z-50 shadow-md" style={{ backgroundColor: '#0F172A' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <Link href="/" className="text-white hover:opacity-80 transition-opacity text-sm">
            ← Volver a Flow Estate AI
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-12">
          <h1 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: '#0F172A' }}>
            Política de Privacidad
          </h1>
          <p className="text-sm mb-8" style={{ color: '#64748B' }}>
            Última actualización: {new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          {/* Intro */}
          <section className="mb-8">
            <p className="mb-4" style={{ color: '#0F172A' }}>
              Flow Estate AI ("nosotros", "la aplicación", "el servicio") es una herramienta impulsada por inteligencia artificial diseñada para que agentes inmobiliarios puedan crear y gestionar contenidos profesionales de propiedades de forma rápida y eficiente.
            </p>
            <p className="mb-4" style={{ color: '#0F172A' }}>
              Esta Política de Privacidad explica qué información recopilamos, cómo la usamos, con quién la compartimos y cuáles son tus derechos. Al utilizar Flow Estate AI, aceptas las prácticas descritas en este documento.
            </p>
          </section>

          {/* Section 1 */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4" style={{ color: '#2563EB' }}>
              1. Información que Recopilamos
            </h2>
            
            <h3 className="text-xl font-semibold mb-3" style={{ color: '#0F172A' }}>
              1.1. Información que tú proporcionas
            </h3>
            <ul className="list-disc pl-6 mb-4 space-y-2" style={{ color: '#0F172A' }}>
              <li><strong>Registro y perfil:</strong> nombre, correo electrónico, foto de perfil (cuando te registras con email, Google o Facebook).</li>
              <li><strong>Contenido de propiedades:</strong> fotos, descripciones de voz (audio), textos y cualquier información que subas sobre propiedades inmobiliarias.</li>
              <li><strong>Información opcional:</strong> logo personal o empresarial, número de teléfono, título profesional, descripción de perfil.</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3" style={{ color: '#0F172A' }}>
              1.2. Información recopilada automáticamente
            </h3>
            <ul className="list-disc pl-6 mb-4 space-y-2" style={{ color: '#0F172A' }}>
              <li><strong>Datos de uso:</strong> páginas visitadas, funciones utilizadas, tiempo en la aplicación, clics y acciones realizadas.</li>
              <li><strong>Información técnica:</strong> tipo de dispositivo, navegador, sistema operativo, resolución de pantalla.</li>
              <li><strong>Dirección IP:</strong> utilizada únicamente para seguridad, prevención de fraude y análisis geográfico general (no rastreamos ubicación precisa).</li>
              <li><strong>Cookies técnicas:</strong> nuestra plataforma (alojada en Vercel) puede utilizar cookies esenciales para mantener tu sesión activa y garantizar el funcionamiento correcto de la aplicación.</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3" style={{ color: '#0F172A' }}>
              1.3. Información de servicios de terceros
            </h3>
            <ul className="list-disc pl-6 space-y-2" style={{ color: '#0F172A' }}>
              <li><strong>Facebook Login:</strong> cuando te registras con Facebook, recibimos únicamente tu nombre, correo electrónico y foto de perfil según los permisos que autorices en Meta.</li>
              <li><strong>Google Login:</strong> similar a Facebook, obtenemos nombre, email y foto de perfil autorizados por Google.</li>
              <li><strong>OpenAI (servicios de IA):</strong> enviamos las grabaciones de voz, fotos y textos que subas para generar descripciones automáticas. OpenAI procesa estos datos según su propia política de privacidad.</li>
            </ul>
          </section>

          {/* Section 2 */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4" style={{ color: '#2563EB' }}>
              2. Cómo Usamos Tu Información
            </h2>
            <p className="mb-4" style={{ color: '#0F172A' }}>
              Utilizamos tus datos para los siguientes propósitos:
            </p>
            <ul className="list-disc pl-6 space-y-2" style={{ color: '#0F172A' }}>
              <li><strong>Proveer el servicio:</strong> permitirte crear, gestionar y compartir contenido de propiedades inmobiliarias.</li>
              <li><strong>Generar contenido con IA:</strong> procesar tus audios, fotos y textos para crear descripciones profesionales automáticamente.</li>
              <li><strong>Gestionar tu cuenta:</strong> autenticación, recuperación de contraseña, configuración de perfil.</li>
              <li><strong>Mejorar la plataforma:</strong> analizar cómo se usa la aplicación para optimizar funciones y experiencia de usuario.</li>
              <li><strong>Comunicación:</strong> enviarte notificaciones importantes sobre tu cuenta, actualizaciones del servicio o cambios en nuestras políticas.</li>
              <li><strong>Seguridad:</strong> prevenir fraudes, abusos y garantizar el funcionamiento seguro de la plataforma.</li>
              <li><strong>Cumplimiento legal:</strong> responder a solicitudes legales cuando sea requerido por ley.</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4" style={{ color: '#2563EB' }}>
              3. Cómo Compartimos Tu Información
            </h2>
            <p className="mb-4" style={{ color: '#0F172A' }}>
              <strong>No vendemos tus datos personales a terceros.</strong>
            </p>
            <p className="mb-4" style={{ color: '#0F172A' }}>
              Podemos compartir información únicamente en los siguientes casos:
            </p>
            <ul className="list-disc pl-6 space-y-2" style={{ color: '#0F172A' }}>
              <li><strong>Proveedores de servicios:</strong> OpenAI (procesamiento de IA), Vercel (hosting), servicios de bases de datos (almacenamiento), Meta y Google (autenticación).</li>
              <li><strong>Cumplimiento legal:</strong> si la ley nos obliga a compartir información con autoridades competentes.</li>
              <li><strong>Protección de derechos:</strong> para proteger la seguridad de nuestros usuarios y de la plataforma.</li>
              <li><strong>Consentimiento:</strong> cuando tú decidas compartir contenido públicamente (portfolio público, enlaces compartidos).</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4" style={{ color: '#2563EB' }}>
              4. Contenido Generado y Propiedad
            </h2>
            <p className="mb-4" style={{ color: '#0F172A' }}>
              <strong>Tú eres el propietario del contenido que creas y subes a Flow Estate AI.</strong> Esto incluye:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2" style={{ color: '#0F172A' }}>
              <li>Fotos de propiedades</li>
              <li>Grabaciones de voz</li>
              <li>Textos y descripciones generadas por IA basadas en tu input</li>
            </ul>
            <p className="mb-4" style={{ color: '#0F172A' }}>
              Al usar nuestro servicio, nos concedes una licencia limitada para procesar, almacenar y mostrar tu contenido únicamente con el propósito de proveer el servicio. Puedes eliminar tu contenido en cualquier momento desde tu cuenta.
            </p>
          </section>

          {/* Section 5 */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4" style={{ color: '#2563EB' }}>
              5. Conservación de Datos
            </h2>
            <p className="mb-4" style={{ color: '#0F172A' }}>
              Guardamos tu información mientras tu cuenta esté activa o mientras sea necesario para proveer el servicio. Si decides eliminar tu cuenta, borraremos tus datos personales de nuestros sistemas, excepto aquella información que debamos conservar por requisitos legales o de seguridad.
            </p>
          </section>

          {/* Section 6 */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4" style={{ color: '#2563EB' }}>
              6. Seguridad
            </h2>
            <p style={{ color: '#0F172A' }}>
              Implementamos medidas de seguridad técnicas y organizativas para proteger tu información, incluyendo cifrado de datos, autenticación segura y controles de acceso. Sin embargo, ningún sistema es completamente infalible, y no podemos garantizar seguridad absoluta.
            </p>
          </section>

          {/* Section 7 */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4" style={{ color: '#2563EB' }}>
              7. Tus Derechos
            </h2>
            <p className="mb-4" style={{ color: '#0F172A' }}>
              Tienes derecho a:
            </p>
            <ul className="list-disc pl-6 space-y-2" style={{ color: '#0F172A' }}>
              <li><strong>Acceder</strong> a tus datos personales</li>
              <li><strong>Corregir</strong> información incorrecta o desactualizada</li>
              <li><strong>Eliminar</strong> tu cuenta y datos asociados</li>
              <li><strong>Exportar</strong> tu información en formato portable</li>
              <li><strong>Oponerte</strong> al procesamiento de tus datos en ciertos casos</li>
              <li><strong>Retirar consentimiento</strong> para tratamientos específicos</li>
            </ul>
            <p className="mt-4" style={{ color: '#0F172A' }}>
              Para ejercer cualquiera de estos derechos, contáctanos en: <a href="mailto:support@flowestateai.com" className="font-semibold" style={{ color: '#2563EB' }}>support@flowestateai.com</a>
            </p>
          </section>

          {/* Section 8 */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4" style={{ color: '#2563EB' }}>
              8. Menores de Edad
            </h2>
            <p style={{ color: '#0F172A' }}>
              Flow Estate AI está diseñado como herramienta profesional para agentes inmobiliarios. No está dirigido específicamente a menores de edad, aunque no existen restricciones de uso por edad dado que no manejamos contenido sensible. Los menores de edad deben usar la plataforma bajo supervisión de un adulto responsable.
            </p>
          </section>

          {/* Section 9 */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4" style={{ color: '#2563EB' }}>
              9. Transferencias Internacionales
            </h2>
            <p style={{ color: '#0F172A' }}>
              Algunos de nuestros proveedores de servicios (como OpenAI) operan en Estados Unidos y otros países. Cuando utilizas Flow Estate AI, tus datos pueden ser transferidos y procesados fuera de Costa Rica. Nos aseguramos de que estos proveedores cumplan con estándares adecuados de protección de datos.
            </p>
          </section>

          {/* Section 10 */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4" style={{ color: '#2563EB' }}>
              10. Cambios a esta Política
            </h2>
            <p style={{ color: '#0F172A' }}>
              Podemos actualizar esta Política de Privacidad ocasionalmente. Te notificaremos sobre cambios significativos mediante un aviso en la aplicación o por correo electrónico. Te recomendamos revisar esta página periódicamente.
            </p>
          </section>

          {/* Section 11 */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4" style={{ color: '#2563EB' }}>
              11. Jurisdicción
            </h2>
            <p style={{ color: '#0F172A' }}>
              Esta Política de Privacidad se rige por las leyes de Costa Rica. Cualquier disputa relacionada con esta política estará sujeta a la jurisdicción de los tribunales de Costa Rica.
            </p>
          </section>

          {/* Contact */}
          <section className="mb-8 p-6 rounded-xl" style={{ backgroundColor: '#F1F5F9' }}>
            <h2 className="text-2xl font-bold mb-4" style={{ color: '#0F172A' }}>
              Contacto
            </h2>
            <p className="mb-2" style={{ color: '#0F172A' }}>
              <strong>Flow Estate AI</strong>
            </p>
            <p className="mb-2" style={{ color: '#0F172A' }}>
              Correo: <a href="mailto:support@flowestateai.com" className="font-semibold" style={{ color: '#2563EB' }}>support@flowestateai.com</a>
            </p>
            <p style={{ color: '#0F172A' }}>
              Website: <a href="https://flowestateai.com" className="font-semibold" style={{ color: '#2563EB' }}>https://flowestateai.com</a>
            </p>
          </section>

          {/* Links */}
          <div className="pt-6 border-t flex flex-col sm:flex-row gap-4 justify-between items-center" style={{ borderColor: '#E5E7EB' }}>
            <Link href="/terms" className="text-sm font-semibold hover:opacity-70 transition-opacity" style={{ color: '#2563EB' }}>
              Ver Términos y Condiciones →
            </Link>
            <Link href="/" className="text-sm font-semibold hover:opacity-70 transition-opacity" style={{ color: '#2563EB' }}>
              ← Volver al Inicio
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 px-4 text-center text-sm" style={{ color: '#64748B' }}>
        <p>© 2025 Flow Estate AI. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}