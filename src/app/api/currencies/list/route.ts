// app/api/currencies/list/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    // Obtener todas las divisas activas
    const { data: currencies, error } = await supabaseAdmin
      .from('currencies')
      .select('*')
      .eq('active', true)
      .order('is_default', { ascending: false }) // Default primero
      .order('code', { ascending: true });

    if (error) {
      console.error('Error al obtener divisas:', error);
      return NextResponse.json(
        { error: 'Error al cargar divisas' },
        { status: 500 }
      );
    }

    // Encontrar la divisa por defecto
    const defaultCurrency = currencies.find(c => c.is_default);

    return NextResponse.json({
      currencies,
      defaultCurrency,
      success: true
    });

  } catch (error: any) {
    console.error('❌ Error en /api/currencies/list:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}