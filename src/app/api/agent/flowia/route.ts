import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getServerSession } from 'next-auth'; 

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('agents')
      .select('whatsapp_number, is_flowia_active')
      .eq('email', session.user.email)
      .single();

    if (error) {
      console.error('Error al obtener configuración de FlowIA:', error);
      return NextResponse.json(
        { error: 'Error al cargar los datos' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('❌ Error en GET /api/agent/flowia:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { whatsapp_number, is_flowia_active } = body;

    // Actualizamos los datos en la tabla agents
    const { data, error } = await supabaseAdmin
      .from('agents')
      .update({ 
        whatsapp_number: whatsapp_number,
        is_flowia_active: is_flowia_active 
      })
      .eq('email', session.user.email)
      .select()
      .single();

    if (error) {
      console.error('Error al actualizar configuración de FlowIA:', error);
      return NextResponse.json(
        { error: 'Error al guardar los datos' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('❌ Error en POST /api/agent/flowia:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}