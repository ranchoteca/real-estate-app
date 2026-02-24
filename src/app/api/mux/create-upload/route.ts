import { NextRequest, NextResponse } from 'next/server';
import Mux from '@mux/mux-node';

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
});

export async function POST(req: NextRequest) {
  try {
    const upload = await mux.video.uploads.create({
      new_asset_settings: {
        playback_policy: ['public'],
        encoding_tier: 'baseline', // Más barato y rápido
      },
      cors_origin: process.env.NEXT_PUBLIC_SITE_URL || '*',
    });

    return NextResponse.json({
      uploadUrl: upload.url,
      uploadId: upload.id,
    });
  } catch (error: any) {
    console.error('Error creating Mux upload:', error);
    return NextResponse.json(
      { error: error.message || 'Error creating upload' },
      { status: 500 }
    );
  }
}