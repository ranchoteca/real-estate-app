// src/lib/emails.ts
// Funciones centralizadas de envío de correos con Resend

import { Resend } from 'resend';
import {
  paymentConfirmedTemplate,
  welcomeTemplate,
  expirationWarningTemplate,
  licenseExpiredTemplate,
} from './email-templates';

const resend = new Resend(process.env.RESEND_API_KEY);

// Cambia esto una vez que verifiques tu dominio en Resend.
// Mientras tanto, en desarrollo puedes usar: onboarding@resend.dev
// (solo permite enviar a tu propio email verificado en Resend)
const FROM = 'Flow Estate AI <hello@info.flowestateai.com>';

// Tipo de resultado estándar para todas las funciones
type EmailResult =
  | { success: true }
  | { success: false; error: string };

// ─────────────────────────────────────────────
// 1. Correo de pago confirmado / Pro activado
// ─────────────────────────────────────────────
export async function sendPaymentConfirmedEmail({
  to,
  agentName,
  reference,
  amount,
  expiresAt,
}: {
  to: string;
  agentName: string;
  reference: string;
  amount?: number | null;
  expiresAt: Date;
}): Promise<EmailResult> {
  try {
    const { subject, html } = paymentConfirmedTemplate({ agentName, reference, amount, expiresAt });
    await resend.emails.send({ from: FROM, to, subject, html });
    return { success: true };
  } catch (err: any) {
    console.error('[Email] Error en sendPaymentConfirmedEmail:', err?.message ?? err);
    return { success: false, error: err?.message ?? 'Error desconocido' };
  }
}

// ─────────────────────────────────────────────
// 2. Correo de bienvenida (registro nuevo agente)
// ─────────────────────────────────────────────
export async function sendWelcomeEmail({
  to,
  agentName,
}: {
  to: string;
  agentName: string;
}): Promise<EmailResult> {
  try {
    const { subject, html } = welcomeTemplate({ agentName });
    await resend.emails.send({ from: FROM, to, subject, html });
    return { success: true };
  } catch (err: any) {
    console.error('[Email] Error en sendWelcomeEmail:', err?.message ?? err);
    return { success: false, error: err?.message ?? 'Error desconocido' };
  }
}

// ─────────────────────────────────────────────
// 3. Aviso de expiración próxima (5 días antes)
// ─────────────────────────────────────────────
export async function sendExpirationWarningEmail({
  to,
  agentName,
  expiresAt,
}: {
  to: string;
  agentName: string;
  expiresAt: Date;
}): Promise<EmailResult> {
  try {
    const { subject, html } = expirationWarningTemplate({ agentName, expiresAt });
    await resend.emails.send({ from: FROM, to, subject, html });
    return { success: true };
  } catch (err: any) {
    console.error('[Email] Error en sendExpirationWarningEmail:', err?.message ?? err);
    return { success: false, error: err?.message ?? 'Error desconocido' };
  }
}

// ─────────────────────────────────────────────
// 4. Correo de licencia expirada
// ─────────────────────────────────────────────
export async function sendLicenseExpiredEmail({
  to,
  agentName,
}: {
  to: string;
  agentName: string;
}): Promise<EmailResult> {
  try {
    const { subject, html } = licenseExpiredTemplate({ agentName });
    await resend.emails.send({ from: FROM, to, subject, html });
    return { success: true };
  } catch (err: any) {
    console.error('[Email] Error en sendLicenseExpiredEmail:', err?.message ?? err);
    return { success: false, error: err?.message ?? 'Error desconocido' };
  }
}