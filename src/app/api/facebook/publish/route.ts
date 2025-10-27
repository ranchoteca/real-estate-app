import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { publishToFacebookPage } from '@/lib/facebook';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { propertyId } = await req.json();

    if (!propertyId) {
      return NextResponse.json({ error: 'ID de propiedad requerido' }, { status: 400 });
    }

    // Obtener agente con info de Facebook
    const { data: agent, error: agentError } = await supabaseAdmin
      .from('agents')
      .select('id, facebook_page_id, facebook_page_name, facebook_access_token')
      .eq('email', session.user.email)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agente no encontrado' }, { status: 404 });
    }

    if (!agent.facebook_access_token || !agent.facebook_page_id) {
      return NextResponse.json({ error: 'Facebook no vinculado' }, { status: 400 });
    }

    // Obtener propiedad
    const { data: property, error: propertyError } = await supabaseAdmin
      .from('properties')
      .select('*')
      .eq('id', propertyId)
      .eq('agent_id', agent.id)
      .single();

    if (propertyError || !property) {
      return NextResponse.json({ error: 'Propiedad no encontrada' }, { status: 404 });
    }

    // Construir mensaje
    const priceText = property.price 
      ? `💰 ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(property.price)}`
      : '💰 Precio a consultar';

    const message = `🏠 ${property.title}\n\n${priceText}\n\n${property.description}\n\n📍 ${property.city}, ${property.state}`;
    
    const propertyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/p/${property.slug}`;
    const imageUrl = property.photos && property.photos.length > 0 ? property.photos[0] : undefined;

    // Publicar en Facebook
    const result = await publishToFacebookPage(
      agent.facebook_access_token,
      agent.facebook_page_id,
      message,
      propertyUrl,
      imageUrl
    );

    console.log('✅ Publicado en Facebook:', result);

    return NextResponse.json({ 
      success: true, 
      postId: result.id,
      message: 'Publicado exitosamente en Facebook'
    });

  } catch (error: any) {
    console.error('❌ Error publicando en Facebook:', error);
    return NextResponse.json({ 
      error: error.message || 'Error al publicar en Facebook' 
    }, { status: 500 });
  }
}