import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { language } = await request.json();

    if (!language || !['es', 'en'].includes(language)) {
      return NextResponse.json(
        { error: 'Invalid language' },
        { status: 400 }
      );
    }

    // Update user language preference in Supabase
    const { error } = await supabase
      .from('agents')
      .update({ preferred_language: language })
      .eq('email', session.user.email);

    if (error) {
      console.error('Error updating language:', error);
      return NextResponse.json(
        { error: 'Failed to update language' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      language 
    });

  } catch (error) {
    console.error('Language update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data, error } = await supabase
      .from('agents')
      .select('preferred_language')
      .eq('email', session.user.email)
      .single();

    if (error) {
      console.error('Error fetching language:', error);
      return NextResponse.json(
        { language: 'es' }, // Default
        { status: 200 }
      );
    }

    return NextResponse.json({ 
      language: data?.preferred_language || 'es' 
    });

  } catch (error) {
    console.error('Language fetch error:', error);
    return NextResponse.json(
      { language: 'es' },
      { status: 200 }
    );
  }
}