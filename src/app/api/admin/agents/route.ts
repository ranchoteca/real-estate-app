import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { data: agents, error } = await supabaseAdmin
      .from('agents')
      .select(`
        *,
        properties (
          views
        ),
        payment_history (
          id,
          reference,
          payment_method,
          amount,
          months,
          payment_date,
          expires_at,
          invoice_number,
          notes,
          created_by
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const agentsWithMetrics = agents?.map(agent => {
      const props = agent.properties || [];
      const payments = agent.payment_history || [];

      // Ordenar pagos del más reciente al más antiguo
      const sortedPayments = payments.sort(
        (a: any, b: any) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
      );

      return {
        ...agent,
        totalProperties: props.length,
        totalViews: props.reduce((acc: number, curr: any) => acc + (curr.views || 0), 0),
        totalPayments: payments.length,
        paymentHistory: sortedPayments,
        properties: undefined,
        payment_history: undefined,
      };
    });

    return NextResponse.json({ agents: agentsWithMetrics });
  } catch (error: any) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}