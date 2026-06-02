// app/api/agent/portfolio-template/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { supabaseAdmin } from '@/lib/supabase';

// ── GET público — usado por PropertyView para detectar plantilla del agente ──
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get('username');

  if (!username) {
    return NextResponse.json({ template: 'minimalist' });
  }

  try {
    const { data: agent } = await supabaseAdmin
      .from('agents')
      .select('portfolio_template')
      .eq('username', username)
      .single();

    return NextResponse.json({
      template: agent?.portfolio_template || 'minimalist',
    });
  } catch {
    return NextResponse.json({ template: 'minimalist' });
  }
}

// ── PATCH autenticado — el agente guarda su plantilla preferida ──────────────
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const body = await req.json();
    const { portfolio_template } = body;

    if (!['minimalist', 'dynamic', 'organic'].includes(portfolio_template)) {
      return NextResponse.json({ error: 'Plantilla no válida' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('agents')
      .update({ portfolio_template })
      .eq('email', session.user.email);

    if (error) {
      console.error('Error actualizando plantilla:', error);
      return NextResponse.json({ error: 'Error al guardar' }, { status: 500 });
    }

    return NextResponse.json({ success: true, portfolio_template });
  } catch (error) {
    console.error('❌ Error en PATCH portfolio-template:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}