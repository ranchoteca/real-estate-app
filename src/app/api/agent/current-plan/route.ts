import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { data: agent, error } = await supabaseAdmin
      .from('agents')
      .select('plan, role, expires_at')
      .eq('email', session.user.email)
      .single();

    if (error || !agent) {
      return NextResponse.json({ plan: 'free', role: 'agent', expires_at: null });
    }

    return NextResponse.json({
      plan: agent.plan || 'free',
      role: agent.role || 'agent',
      expires_at: agent.expires_at || null,
    });

  } catch (error: any) {
    console.error('Error fetching plan:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}