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

    // Seleccionamos los agentes y sus propiedades (solo la columna views)
    const { data: agents, error } = await supabaseAdmin
      .from('agents')
      .select(`
        *,
        properties (
          views
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Procesamos la data para que el frontend la reciba lista
    const agentsWithMetrics = agents?.map(agent => {
      const props = agent.properties || [];
      return {
        ...agent,
        totalProperties: props.length,
        totalViews: props.reduce((acc: number, curr: any) => acc + (curr.views || 0), 0),
        properties: undefined // Limpiamos el array de props para no saturar la respuesta
      };
    });

    return NextResponse.json({ agents: agentsWithMetrics });
  } catch (error: any) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}