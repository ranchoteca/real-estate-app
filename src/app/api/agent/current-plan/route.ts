// src/app/api/agent/current-plan/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { sendExpirationWarningEmail, sendLicenseExpiredEmail } from '@/lib/emails';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { data: agent, error } = await supabaseAdmin
      .from('agents')
      .select('id, email, full_name, plan, role, expires_at, plan_started_at, warning_email_sent_at, expired_email_sent_at, created_at, portfolio_template')
      .eq('email', session.user.email)
      .single();

    if (error || !agent) {
      return NextResponse.json({ plan: 'free', role: 'agent', expires_at: null });
    }

    // Solo aplica lógica de expiración a agentes Pro con fecha de vencimiento
    if (agent.plan === 'pro' && agent.expires_at) {
      const now = new Date();
      const expiresAt = new Date(agent.expires_at);
      const daysUntilExpiration = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

      // ── CASO 1: Licencia ya expiró ──────────────────────────────────────
      if (expiresAt < now) {
        // Degradar a free y enviar correo (solo si no se ha enviado aún para este ciclo)
        const alreadySentExpired = agent.expired_email_sent_at
          ? new Date(agent.expired_email_sent_at) > new Date(agent.expires_at)
          : false;

        await supabaseAdmin
          .from('agents')
          .update({
            plan: 'free',
            ...(alreadySentExpired ? {} : { expired_email_sent_at: now.toISOString() }),
          })
          .eq('id', agent.id);

        if (!alreadySentExpired) {
          // No esperamos el resultado — no queremos bloquear la respuesta al agente
          sendLicenseExpiredEmail({
            to: agent.email,
            agentName: agent.full_name || 'Agente',
          }).catch((err) =>
            console.error('[Email] Error enviando correo de expiración:', err)
          );
        }

        return NextResponse.json({
          plan: 'free',
          role: agent.role || 'agent',
          expires_at: null,
          created_at: agent.created_at || null,
          portfolio_template: agent.portfolio_template || 'minimalist',
        });
      }

      // ── CASO 2: Faltan 5 días o menos para expirar ──────────────────────
      if (daysUntilExpiration <= 5) {
        // Solo enviar si no se ha enviado aviso para este ciclo de licencia
        const alreadySentWarning = agent.warning_email_sent_at
          ? new Date(agent.warning_email_sent_at) > new Date(agent.plan_started_at ?? 0)
          : false;

        if (!alreadySentWarning) {
          await supabaseAdmin
            .from('agents')
            .update({ warning_email_sent_at: now.toISOString() })
            .eq('id', agent.id);

          sendExpirationWarningEmail({
            to: agent.email,
            agentName: agent.full_name || 'Agente',
            expiresAt,
          }).catch((err) =>
            console.error('[Email] Error enviando correo de aviso:', err)
          );
        }
      }
    }

    return NextResponse.json({
      plan: agent.plan || 'free',
      role: agent.role || 'agent',
      expires_at: agent.expires_at || null,
      created_at: agent.created_at || null,
    });

  } catch (error: any) {
    console.error('Error fetching plan:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}