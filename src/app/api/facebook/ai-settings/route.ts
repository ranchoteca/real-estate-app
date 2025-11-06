import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { enabled, colorPrimary, colorSecondary, template } = await req.json();

    const { data: agent } = await supabaseAdmin
      .from('agents')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (!agent) {
      return NextResponse.json({ error: 'Agente no encontrado' }, { status: 404 });
    }

    await supabaseAdmin
      .from('agents')
      .update({
        fb_ai_enabled: enabled,
        fb_brand_color_primary: colorPrimary,
        fb_brand_color_secondary: colorSecondary,
        fb_template: template,
      })
      .eq('id', agent.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error guardando configuración:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}