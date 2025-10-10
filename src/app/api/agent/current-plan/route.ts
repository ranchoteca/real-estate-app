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
      .select('plan, properties_this_month')
      .eq('email', session.user.email)
      .single();

    if (error || !agent) {
      return NextResponse.json({ plan: 'free', properties_this_month: 0 });
    }

    return NextResponse.json({
      plan: agent.plan || 'free',
      properties_this_month: agent.properties_this_month || 0,
    });

  } catch (error: any) {
    console.error('Error fetching plan:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}