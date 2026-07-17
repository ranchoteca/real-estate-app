// ============================================================
// app/api/music/catalog/route.ts
// ============================================================

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from('stock_music')
    .select('id, name, genre, cloudinary_public_id, preview_url, duration_seconds')
    .order('genre', { ascending: true });

  if (error) {
    console.error('❌ Error cargando catálogo de música:', error);
    return NextResponse.json({ error: 'Error al cargar catálogo de música' }, { status: 500 });
  }

  return NextResponse.json({ tracks: data || [] });
}