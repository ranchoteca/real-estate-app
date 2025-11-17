// app/api/agent/update-currency/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const { currency_id } = await req.json();

    if (!currency_id) {
      return NextResponse.json(
        { error: 'currency_id es requerido' },
        { status: 400 }
      );
    }

    // Verificar que la divisa existe y está activa
    const { data: currency, error: currencyError } = await supabaseAdmin
      .from('currencies')
      .select('*')
      .eq('id', currency_id)
      .eq('active', true)
      .single();

    if (currencyError || !currency) {
      return NextResponse.json(
        { error: 'Divisa no válida' },
        { status: 400 }
      );
    }

    // Actualizar divisa del agente
    const { error: updateError } = await supabaseAdmin
      .from('agents')
      .update({ default_currency_id: currency_id })
      .eq('email', session.user.email);

    if (updateError) {
      console.error('Error al actualizar divisa del agente:', updateError);
      return NextResponse.json(
        { error: 'Error al actualizar divisa' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Divisa por defecto actualizada a ${currency.code}`,
      currency
    });

  } catch (error: any) {
    console.error('❌ Error en /api/agent/update-currency:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}