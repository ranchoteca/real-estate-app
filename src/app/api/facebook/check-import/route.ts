import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ alreadyImported: false });
    }

    const postId = req.nextUrl.searchParams.get('postId');
    if (!postId) {
      return NextResponse.json({ alreadyImported: false });
    }

    const { data: agent } = await supabaseAdmin
      .from('agents')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (!agent) return NextResponse.json({ alreadyImported: false });

    const { data: existing } = await supabaseAdmin
      .from('facebook_posts')
      .select('id')
      .eq('agent_id', agent.id)
      .eq('facebook_post_id', postId)
      .maybeSingle();

    return NextResponse.json({ alreadyImported: !!existing });
  } catch {
    return NextResponse.json({ alreadyImported: false });
  }
}