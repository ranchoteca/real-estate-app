// src/lib/email-templates.ts
// Plantillas HTML para todos los correos de Flow Estate AI

const BASE_STYLES = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background-color: #f8fafc;
  margin: 0;
  padding: 0;
`;

const CARD_STYLES = `
  background: #ffffff;
  border-radius: 24px;
  max-width: 520px;
  margin: 40px auto;
  padding: 48px 40px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.06);
`;

const LOGO_HTML = `
  <div style="margin-bottom: 32px;">
    <span style="font-size: 20px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px;">
      Flow Estate <span style="color: #2563eb;">AI</span>
    </span>
  </div>
`;

const FOOTER_HTML = `
  <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #f1f5f9;">
    <p style="font-size: 12px; color: #94a3b8; margin: 0; line-height: 1.6;">
      Este correo fue enviado automáticamente por Flow Estate AI.<br/>
      Si tienes preguntas, contáctanos respondiendo este mensaje.
    </p>
  </div>
`;

function wrapInLayout(content: string): string {
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>Flow Estate AI</title>
    </head>
    <body style="${BASE_STYLES}">
      <div style="${CARD_STYLES}">
        ${LOGO_HTML}
        ${content}
        ${FOOTER_HTML}
      </div>
    </body>
    </html>
  `;
}

// ─────────────────────────────────────────────
// 1. PAGO CONFIRMADO / PRO ACTIVADO
// ─────────────────────────────────────────────
export function paymentConfirmedTemplate({
  agentName,
  reference,
  amount,
  expiresAt,
}: {
  agentName: string;
  reference: string;
  amount?: number | null;
  expiresAt: Date;
}): { subject: string; html: string } {
  const formattedDate = expiresAt.toLocaleDateString('es-CR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const formattedAmount = amount
    ? `₡${Number(amount).toLocaleString('es-CR')}`
    : null;

  const html = wrapInLayout(`
    <h1 style="font-size: 26px; font-weight: 900; color: #0f172a; margin: 0 0 8px;">
      ¡Tu plan Pro está activo! 🚀
    </h1>
    <p style="font-size: 15px; color: #64748b; margin: 0 0 32px;">
      Hola, <strong>${agentName}</strong>. Hemos recibido tu pago y todo está listo.
    </p>

    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 16px; padding: 24px; margin-bottom: 32px;">
      <p style="font-size: 11px; font-weight: 800; color: #16a34a; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 16px;">
        Detalles del Pago
      </p>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="font-size: 13px; color: #64748b; font-weight: 600; padding: 4px 0;">Referencia</td>
          <td style="font-size: 13px; color: #0f172a; font-weight: 800; text-align: right;">${reference}</td>
        </tr>
        ${formattedAmount ? `
        <tr>
          <td style="font-size: 13px; color: #64748b; font-weight: 600; padding: 4px 0;">Monto</td>
          <td style="font-size: 13px; color: #0f172a; font-weight: 800; text-align: right;">${formattedAmount}</td>
        </tr>` : ''}
        <tr>
          <td style="font-size: 13px; color: #64748b; font-weight: 600; padding: 4px 0;">Plan activo hasta</td>
          <td style="font-size: 13px; color: #16a34a; font-weight: 800; text-align: right;">${formattedDate}</td>
        </tr>
      </table>
    </div>

    <p style="font-size: 14px; color: #475569; line-height: 1.7; margin: 0 0 24px;">
      Ya tienes acceso ilimitado a todas las herramientas Pro: publicaciones ilimitadas,
      analíticas avanzadas, videos, tarjeta digital y mucho más.
    </p>

    <a href="https://flowestate.ai/dashboard"
       style="display: inline-block; background: #2563eb; color: #ffffff; font-size: 14px;
              font-weight: 800; padding: 14px 28px; border-radius: 14px; text-decoration: none;">
      Ir al Dashboard →
    </a>
  `);

  return {
    subject: '¡Tu cuenta Pro de Flow Estate AI está activa! 🚀',
    html,
  };
}

// ─────────────────────────────────────────────
// 2. BIENVENIDA (registro nuevo agente)
// ─────────────────────────────────────────────
export function welcomeTemplate({
  agentName,
}: {
  agentName: string;
}): { subject: string; html: string } {
  const html = wrapInLayout(`
    <h1 style="font-size: 26px; font-weight: 900; color: #0f172a; margin: 0 0 8px;">
      ¡Bienvenido a Flow Estate AI! 👋
    </h1>
    <p style="font-size: 15px; color: #64748b; margin: 0 0 32px;">
      Hola, <strong>${agentName}</strong>. Tu cuenta ha sido creada exitosamente.
    </p>

    <p style="font-size: 14px; color: #475569; line-height: 1.7; margin: 0 0 24px;">
      Con tu cuenta gratuita puedes empezar a publicar propiedades, crear tu perfil de agente
      y explorar todas las herramientas que tenemos para ti.
    </p>

    <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 16px; padding: 24px; margin-bottom: 32px;">
      <p style="font-size: 11px; font-weight: 800; color: #2563eb; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 14px;">
        ¿Qué puedes hacer ahora?
      </p>
      <ul style="margin: 0; padding-left: 20px; color: #475569; font-size: 13px; line-height: 2;">
        <li>Crear y publicar tu primera propiedad</li>
        <li>Completar tu perfil de agente</li>
        <li>Explorar las herramientas de IA</li>
        <li>Activar tu plan Pro cuando estés listo</li>
      </ul>
    </div>

    <a href="https://flowestate.ai/dashboard"
       style="display: inline-block; background: #2563eb; color: #ffffff; font-size: 14px;
              font-weight: 800; padding: 14px 28px; border-radius: 14px; text-decoration: none;">
      Explorar mi cuenta →
    </a>
  `);

  return {
    subject: '¡Bienvenido a Flow Estate AI! Tu cuenta está lista 🏡',
    html,
  };
}

// ─────────────────────────────────────────────
// 3. AVISO: LICENCIA EXPIRA EN 5 DÍAS
// ─────────────────────────────────────────────
export function expirationWarningTemplate({
  agentName,
  expiresAt,
}: {
  agentName: string;
  expiresAt: Date;
}): { subject: string; html: string } {
  const formattedDate = expiresAt.toLocaleDateString('es-CR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const html = wrapInLayout(`
    <h1 style="font-size: 26px; font-weight: 900; color: #0f172a; margin: 0 0 8px;">
      Tu plan Pro vence pronto ⏳
    </h1>
    <p style="font-size: 15px; color: #64748b; margin: 0 0 32px;">
      Hola, <strong>${agentName}</strong>. Tu suscripción está por vencer.
    </p>

    <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 16px; padding: 24px; margin-bottom: 32px;">
      <p style="font-size: 13px; color: #92400e; line-height: 1.7; margin: 0;">
        Tu plan Pro expira el <strong>${formattedDate}</strong>. Para no perder el acceso
        a tus herramientas, realiza tu pago antes de esa fecha.
      </p>
    </div>

    <p style="font-size: 14px; color: #475569; line-height: 1.7; margin: 0 0 24px;">
      Si ya realizaste el pago, ignora este mensaje. De lo contrario, contáctanos
      para coordinar la renovación.
    </p>

    <a href="https://flowestate.ai/pricing"
       style="display: inline-block; background: #d97706; color: #ffffff; font-size: 14px;
              font-weight: 800; padding: 14px 28px; border-radius: 14px; text-decoration: none;">
      Ver planes →
    </a>
  `);

  return {
    subject: '⏳ Tu plan Pro de Flow Estate AI vence en 5 días',
    html,
  };
}

// ─────────────────────────────────────────────
// 4. LICENCIA EXPIRADA
// ─────────────────────────────────────────────
export function licenseExpiredTemplate({
  agentName,
}: {
  agentName: string;
}): { subject: string; html: string } {
  const html = wrapInLayout(`
    <h1 style="font-size: 26px; font-weight: 900; color: #0f172a; margin: 0 0 8px;">
      Tu plan Pro ha expirado 😔
    </h1>
    <p style="font-size: 15px; color: #64748b; margin: 0 0 32px;">
      Hola, <strong>${agentName}</strong>. Tu suscripción Pro ya no está activa.
    </p>

    <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 16px; padding: 24px; margin-bottom: 32px;">
      <p style="font-size: 13px; color: #991b1b; line-height: 1.7; margin: 0;">
        Tu cuenta ha vuelto al plan gratuito. Tus propiedades y datos están seguros,
        pero algunas funciones Pro no estarán disponibles hasta que renueves.
      </p>
    </div>

    <p style="font-size: 14px; color: #475569; line-height: 1.7; margin: 0 0 24px;">
      Para reactivar tu plan y recuperar el acceso completo, coordina tu pago con nosotros.
      Es rápido y tu cuenta quedará activa de inmediato.
    </p>

    <a href="https://flowestate.ai/pricing"
       style="display: inline-block; background: #2563eb; color: #ffffff; font-size: 14px;
              font-weight: 800; padding: 14px 28px; border-radius: 14px; text-decoration: none;">
      Renovar mi plan →
    </a>
  `);

  return {
    subject: 'Tu plan Pro de Flow Estate AI ha expirado',
    html,
  };
}