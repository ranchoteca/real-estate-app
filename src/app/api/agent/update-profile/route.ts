import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { supabaseAdmin } from '@/lib/supabase';

// Definimos el tipo de la tabla agents
type Agent = {
  id: string;
  email: string;
  username: string | null;
  full_name: string | null;
  phone: string | null;
  brokerage: string | null;
  credits: number;
};

export async function POST(req: NextRequest) {
  try {
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
      const { data: existingUser } = await supabaseAdmin!
        .from<Agent>('agents')
        .select('id, email')
        .eq('username', username)
        .single();

      if (existingUser && existingUser.email !== session.user.email) {
        return NextResponse.json(
          { error: 'Este username ya está en uso' },
          { status: 400 }
        );
      }
    }

    // Actualizar perfil
    const { error } = await supabaseAdmin!
      .from<Agent>('agents')
      .update({
        username: username || null,
        full_name: fullName || null,
        phone: phone || null,
        brokerage: brokerage || null,
      })
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
        details: error 
      },
      { status: 500 }
    );
  }
}