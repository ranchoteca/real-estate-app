import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const agentIdParam = searchParams.get('agent_id');
    
    let agentId: string;
    
    if (agentIdParam) {
      // Modo: via token (external upload)
      agentId = agentIdParam;
      console.log('📋 Cargando perfil para agent_id:', agentId);
    } else {
      // Modo: usuario autenticado
      const session = await getServerSession();
      if (!session?.user?.email) {
        return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
      }

      const { data: agentData } = await supabaseAdmin
        .from('agents')
        .select('id')
        .eq('email', session.user.email)
        .single();

      if (!agentData) {
        return NextResponse.json({ error: 'Agente no encontrado' }, { status: 404 });
      }
      
      agentId = agentData.id;
    }
    
    // Obtener perfil completo usando agentId
    const { data: agent, error } = await supabaseAdmin
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .single();

    if (error || !agent) {
      return NextResponse.json({ error: 'Agente no encontrado' }, { status: 404 });
    }

    console.log('✅ Perfil cargado:', { 
      id: agent.id, 
      watermark_logo: agent.watermark_logo ? 'SÍ' : 'NO' 
    });

    return NextResponse.json({ agent });

  } catch (error: any) {
    console.error('Error en agent profile:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}