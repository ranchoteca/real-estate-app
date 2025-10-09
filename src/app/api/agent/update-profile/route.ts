import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    // Verificar que supabaseAdmin esté disponible
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Servicio no disponible' },
        { status: 500 }
      );
    }

    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const { username, fullName, phone, brokerage } = await req.json();

    // Validar username (solo si se proporciona)
    if (username) {
      if (!/^[a-z0-9_]{3,30}$/.test(username)) {
        return NextResponse.json(
          { error: 'Username inválido. Solo letras minúsculas, números y guion bajo (3-30 caracteres)' },
          { status: 400 }
        );
      }

      // Verificar si el username ya existe (excepto el del usuario actual)
      const { data: existingUser, error: checkError } = await supabaseAdmin
        .from('agents')
        .select('id, email')
        .eq('username', username)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error al verificar username:', checkError);
        return NextResponse.json(
          { error: 'Error al verificar disponibilidad del username' },
          { status: 500 }
        );
      }

      // Tipar la respuesta manualmente
      type AgentCheck = {
        id: string;
        email: string;
      } | null;

      const existingAgent = existingUser as AgentCheck;

      if (existingAgent && existingAgent.email !== session.user.email) {
        return NextResponse.json(
          { error: 'Este username ya está en uso' },
          { status: 400 }
        );
      }
    }

    // WORKAROUND: Usar any temporalmente para evitar problemas de tipado de Supabase
    const updateData = {
      username: username || null,
      full_name: fullName || null,
      phone: phone || null,
      brokerage: brokerage || null,
    };

    // Usar any temporalmente para el update
    const { error } = await (supabaseAdmin as any)
      .from('agents')
      .update(updateData)
      .eq('email', session.user.email);

    if (error) {
      console.error('Error al actualizar perfil:', error);
      return NextResponse.json(
        { error: 'Error al actualizar el perfil' },
        { status: 500 }
      );
    }

    console.log('✅ Perfil actualizado para:', session.user.email);

    return NextResponse.json({
      success: true,
      message: 'Perfil actualizado exitosamente',
    });

  } catch (error) {
    console.error('❌ Error al actualizar perfil:', error);

    return NextResponse.json(
      { 
        error: 'Error al actualizar el perfil',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}