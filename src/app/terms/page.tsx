import Link from 'next/link';

export default function TermsPage() {
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
            Términos y Condiciones
          </h1>
          <p className="text-sm mb-8" style={{ color: '#64748B' }}>
            Última actualización: {new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          {/* Intro */}
          <section className="mb-8">
            <p className="mb-4" style={{ color: '#0F172A' }}>
              Estos Términos y Condiciones ("Términos") regulan el uso de Flow Estate AI ("nosotros", "la aplicación", "el servicio"), una plataforma web progresiva (PWA) diseñada para que agentes inmobiliarios creen y gestionen contenido profesional de propiedades mediante inteligencia artificial.
            </p>
            <p className="mb-4" style={{ color: '#0F172A' }}>
              Al acceder o utilizar Flow Estate AI, aceptas estar sujeto a estos Términos. Si no estás de acuerdo con alguna parte de estos Términos, no debes usar nuestra plataforma.
            </p>
          </section>

          {/* Section 1 */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4" style={{ color: '#2563EB' }}>
              1. Uso del Servicio
            </h2>
            <p className="mb-4" style={{ color: '#0F172A' }}>
              Flow Estate AI proporciona herramientas impulsadas por IA para crear descripciones, títulos y contenido profesional de propiedades inmobiliarias. Al usar nuestro servicio, te comprometes a:
            </p>
            <ul className="list-disc pl-6 space-y-2" style={{ color: '#0F172A' }}>
              <li>Utilizar la plataforma de manera legal y respetuosa</li>
              <li>No publicar contenido ofensivo, ilegal o que viole derechos de terceros</li>
              <li>No intentar acceder a partes del sistema a las que no tienes autorización</li>
              <li>No usar la plataforma para fines fraudulentos o maliciosos</li>
              <li>No automatizar el uso del servicio sin permiso explícito</li>
              <li>No sobrecargar nuestros servidores o interferir con el funcionamiento normal</li>
            </ul>
          </section>

          {/* Section 2 */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4" style={{ color: '#2563EB' }}>
              2. Cuentas de Usuario
            </h2>
            <p className="mb-4" style={{ color: '#0F172A' }}>
              Para utilizar Flow Estate AI, puedes crear una cuenta mediante:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2" style={{ color: '#0F172A' }}>
              <li>Email y contraseña</li>
              <li>Inicio de sesión con Google</li>
              <li>Inicio de sesión con Facebook</li>
            </ul>
            <p className="mb-4" style={{ color: '#0F172A' }}>
              Eres responsable de:
            </p>
            <ul className="list-disc pl-6 space-y-2" style={{ color: '#0F172A' }}>
              <li>Proporcionar información veraz y actualizada</li>
              <li>Mantener la seguridad de tu cuenta y contraseña</li>
              <li>Todas las actividades realizadas bajo tu cuenta</li>
              <li>Notificarnos inmediatamente sobre cualquier uso no autorizado</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4" style={{ color: '#2563EB' }}>
              3. Contenido Generado con IA
            </h2>
            <p className="mb-4" style={{ color: '#0F172A' }}>
              Flow Estate AI utiliza inteligencia artificial (OpenAI) para generar contenido basado en las fotos, descripciones de voz y textos que proporciones.
            </p>
            
            <h3 className="text-xl font-semibold mb-3" style={{ color: '#0F172A' }}>
              3.1. Exactitud y Responsabilidad
            </h3>
            <p className="mb-4" style={{ color: '#0F172A' }}>
              Si bien nos esforzamos por generar contenido de alta calidad, la IA puede producir errores, inexactitudes o información incompleta. <strong>Eres responsable de revisar, verificar y aprobar todo el contenido generado antes de publicarlo o compartirlo.</strong>
            </p>

            <h3 className="text-xl font-semibold mb-3" style={{ color: '#0F172A' }}>
              3.2. Propiedad del Contenido
            </h3>
            <p className="mb-4" style={{ color: '#0F172A' }}>
              <strong>Tú conservas todos los derechos sobre el contenido que subes y creas en Flow Estate AI.</strong> Esto incluye:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2" style={{ color: '#0F172A' }}>
              <li>Fotos de propiedades</li>
              <li>Grabaciones de audio</li>
              <li>Textos y descripciones generadas por la IA</li>
            </ul>
            <p className="mb-4" style={{ color: '#0F172A' }}>
              Al subir contenido, nos concedes una licencia no exclusiva, mundial y libre de regalías para procesar, almacenar, mostrar y distribuir tu contenido únicamente con el propósito de proveer el servicio. Esta licencia termina cuando eliminas el contenido o cierras tu cuenta.
            </p>

            <h3 className="text-xl font-semibold mb-3" style={{ color: '#0F172A' }}>
              3.3. Contenido Público
            </h3>
            <p style={{ color: '#0F172A' }}>
              Si decides hacer público tu portfolio o compartir enlaces de propiedades, el contenido será accesible para cualquier persona con el enlace. Eres responsable de gestionar qué contenido compartes públicamente.
            </p>
          </section>

          {/* Section 4 */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4" style={{ color: '#2563EB' }}>
              4. Planes y Precios
            </h2>
            <p className="mb-4" style={{ color: '#0F172A' }}>
              Flow Estate AI puede ofrecer diferentes planes de servicio, incluyendo opciones gratuitas y de pago. Los detalles específicos de cada plan se describen en la aplicación.
            </p>
            <ul className="list-disc pl-6 space-y-2" style={{ color: '#0F172A' }}>
              <li>Podemos actualizar los precios con notificación previa</li>
              <li>Los cambios en planes no afectarán períodos ya pagados</li>
              <li>Puedes cancelar tu suscripción en cualquier momento desde tu cuenta</li>
              <li>No ofrecemos reembolsos por períodos parcialmente utilizados, salvo que la ley lo requiera</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4" style={{ color: '#2563EB' }}>
              5. Uso Aceptable y Límites
            </h2>
            <p className="mb-4" style={{ color: '#0F172A' }}>
              Para garantizar un servicio de calidad para todos, implementamos las siguientes políticas:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2" style={{ color: '#0F172A' }}>
              <li>Cada plan tiene límites en el número de propiedades que puedes crear</li>
              <li>No permitimos el uso automatizado masivo (bots, scrapers) sin autorización</li>
              <li>Reservamos el derecho de limitar o suspender cuentas que generen carga excesiva en el sistema</li>
              <li>No se permite revender o redistribuir el servicio sin autorización</li>
            </ul>
            <p style={{ color: '#0F172A' }}>
              Si necesitas límites más altos o uso empresarial, contáctanos en <a href="mailto:support@flowestateai.com" className="font-semibold" style={{ color: '#2563EB' }}>support@flowestateai.com</a>
            </p>
          </section>

          {/* Section 6 */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4" style={{ color: '#2563EB' }}>
              6. Disponibilidad del Servicio
            </h2>
            <p className="mb-4" style={{ color: '#0F172A' }}>
              Nos esforzamos por mantener Flow Estate AI disponible 24/7, pero:
            </p>
            <ul className="list-disc pl-6 space-y-2" style={{ color: '#0F172A' }}>
              <li>No garantizamos disponibilidad ininterrumpida del servicio</li>
              <li>Podemos realizar mantenimiento programado con aviso previo cuando sea posible</li>
              <li>Pueden ocurrir interrupciones por razones técnicas fuera de nuestro control</li>
              <li>Podemos modificar, actualizar o descontinuar funciones con notificación previa</li>
            </ul>
          </section>

          {/* Section 7 */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4" style={{ color: '#2563EB' }}>
              7. Propiedad Intelectual
            </h2>
            <p className="mb-4" style={{ color: '#0F172A' }}>
              Flow Estate AI, incluyendo su software, diseño, marca, logo y código, es propiedad exclusiva de sus creadores y está protegido por leyes de propiedad intelectual.
            </p>
            <p className="mb-4" style={{ color: '#0F172A' }}>
              No puedes:
            </p>
            <ul className="list-disc pl-6 space-y-2" style={{ color: '#0F172A' }}>
              <li>Copiar, modificar o distribuir nuestro código o diseño</li>
              <li>Utilizar nuestra marca o logo sin permiso explícito</li>
              <li>Realizar ingeniería inversa de la plataforma</li>
              <li>Crear servicios derivados o competidores basados en Flow Estate AI</li>
            </ul>
          </section>

          {/* Section 8 */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4" style={{ color: '#2563EB' }}>
              8. Limitación de Responsabilidad
            </h2>
            <p className="mb-4" style={{ color: '#0F172A' }}>
              Flow Estate AI se proporciona "tal cual" sin garantías de ningún tipo. En la máxima medida permitida por la ley:
            </p>
            <ul className="list-disc pl-6 space-y-2" style={{ color: '#0F172A' }}>
              <li>No somos responsables por pérdida de datos, ingresos o oportunidades de negocio</li>
              <li>No garantizamos que el contenido generado por IA sea exacto, completo o adecuado para tus propósitos</li>
              <li>No somos responsables por decisiones comerciales tomadas basándose en contenido generado por la plataforma</li>
              <li>No somos responsables por daños indirectos, incidentales o consecuentes</li>
              <li>Nuestra responsabilidad total está limitada a las cantidades pagadas por el servicio en los últimos 12 meses</li>
            </ul>
            <p className="mt-4" style={{ color: '#0F172A' }}>
              <strong>Eres responsable de verificar toda la información antes de publicarla o utilizarla profesionalmente.</strong>
            </p>
          </section>

          {/* Section 9 */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4" style={{ color: '#2563EB' }}>
              9. Suspensión y Terminación
            </h2>
            <p className="mb-4" style={{ color: '#0F172A' }}>
              Podemos suspender o terminar tu acceso a Flow Estate AI si:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2" style={{ color: '#0F172A' }}>
              <li>Violas estos Términos y Condiciones</li>
              <li>Usas la plataforma de manera fraudulenta o ilegal</li>
              <li>Tu cuenta permanece inactiva por tiempo prolongado</li>
              <li>Realizas actividades que comprometan la seguridad del servicio</li>
            </ul>
            <p className="mb-4" style={{ color: '#0F172A' }}>
              Tú puedes cancelar tu cuenta en cualquier momento desde la configuración. Al hacerlo, tu contenido será eliminado según nuestra Política de Privacidad.
            </p>
          </section>

          {/* Section 10 */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4" style={{ color: '#2563EB' }}>
              10. Modificaciones a los Términos
            </h2>
            <p style={{ color: '#0F172A' }}>
              Podemos actualizar estos Términos ocasionalmente para reflejar cambios en el servicio o por requisitos legales. Te notificaremos sobre cambios significativos mediante aviso en la aplicación o por correo electrónico. El uso continuado del servicio después de cambios constituye tu aceptación de los nuevos Términos.
            </p>
          </section>

          {/* Section 11 */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4" style={{ color: '#2563EB' }}>
              11. Ley Aplicable y Jurisdicción
            </h2>
            <p className="mb-4" style={{ color: '#0F172A' }}>
              Estos Términos se rigen por las leyes de Costa Rica. Cualquier disputa relacionada con estos Términos o el uso de Flow Estate AI estará sujeta a la jurisdicción exclusiva de los tribunales de Costa Rica.
            </p>
            <p style={{ color: '#0F172A' }}>
              Ambas partes acuerdan resolver disputas de buena fe antes de recurrir a procesos legales formales.
            </p>
          </section>

          {/* Section 12 */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4" style={{ color: '#2563EB' }}>
              12. Disposiciones Generales
            </h2>
            <ul className="list-disc pl-6 space-y-2" style={{ color: '#0F172A' }}>
              <li><strong>Divisibilidad:</strong> Si alguna disposición de estos Términos es considerada inválida, las demás disposiciones permanecerán en vigor.</li>
              <li><strong>Renuncia:</strong> El hecho de que no ejerzamos un derecho no constituye renuncia al mismo.</li>
              <li><strong>Acuerdo completo:</strong> Estos Términos, junto con nuestra Política de Privacidad, constituyen el acuerdo completo entre tú y Flow Estate AI.</li>
              <li><strong>Asignación:</strong> No puedes transferir estos Términos sin nuestro consentimiento. Nosotros podemos asignarlos libremente.</li>
            </ul>
          </section>

          {/* Contact */}
          <section className="mb-8 p-6 rounded-xl" style={{ backgroundColor: '#F1F5F9' }}>
            <h2 className="text-2xl font-bold mb-4" style={{ color: '#0F172A' }}>
              Contacto
            </h2>
            <p className="mb-4" style={{ color: '#0F172A' }}>
              Si tienes preguntas sobre estos Términos y Condiciones, puedes contactarnos en:
            </p>
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
            <Link href="/privacy" className="text-sm font-semibold hover:opacity-70 transition-opacity" style={{ color: '#2563EB' }}>
              Ver Política de Privacidad →
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