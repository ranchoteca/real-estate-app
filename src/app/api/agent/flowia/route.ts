import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // Manejo interno de Next.js
            }
          },
        },
      }
    );

    const { data: { session } } = await supabase.auth.getSession();

    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { data, error } = await supabase
      .from('agents')
      .select('whatsapp_number, is_flowia_active')
      .eq('user_id', session.user.id)
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // Manejo interno de Next.js
            }
          },
        },
      }
    );

    const { data: { session } } = await supabase.auth.getSession();

    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const body = await request.json();
    const { whatsapp_number, is_flowia_active } = body;

    const { error } = await supabase
      .from('agents')
      .update({ whatsapp_number, is_flowia_active })
      .eq('user_id', session.user.id);

    if (error) throw error;

    return NextResponse.json({ message: 'Configuración de FlowIA guardada exitosamente' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}