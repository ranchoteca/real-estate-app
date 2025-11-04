import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

const PAYPAL_API = process.env.PAYPAL_MODE === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

async function getPayPalAccessToken() {
  const auth = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString('base64');

  const response = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const data = await response.json();
  return data.access_token;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { planId, paypalPlanId } = await req.json();

    const accessToken = await getPayPalAccessToken();

    // Crear suscripción en PayPal
    const response = await fetch(`${PAYPAL_API}/v1/billing/subscriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        plan_id: paypalPlanId,
        application_context: {
          brand_name: 'Flow Estate AI',
          user_action: 'SUBSCRIBE_NOW',
          return_url: `${process.env.NEXTAUTH_URL}/api/payments/success`,
          cancel_url: `${process.env.NEXTAUTH_URL}/pricing`,
        },
        custom_id: session.user.email, // Para identificar al usuario
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('PayPal error:', data);
      return NextResponse.json({ error: 'Error al crear suscripción' }, { status: 500 });
    }

    // Encontrar approval URL
    const approvalUrl = data.links.find((link: any) => link.rel === 'approve')?.href;

    return NextResponse.json({
      success: true,
      subscriptionId: data.id,
      approvalUrl,
    });

  } catch (error: any) {
    console.error('Error creating subscription:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}