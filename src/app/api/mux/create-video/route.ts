import { NextRequest, NextResponse } from 'next/server';
import Mux from '@mux/mux-node';
import { getServerSession } from 'next-auth';

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { assetIds } = await req.json();

    if (!assetIds || assetIds.length === 0) {
      return NextResponse.json({ error: 'No asset IDs provided' }, { status: 400 });
    }

    // Crear un video fusionado usando Mux Stitching
    // Nota: Mux concatena los videos en el orden del array
    const asset = await mux.video.assets.create({
      input: assetIds.map((id: string) => ({ asset_id: id })),
      playback_policy: ['public'],
      encoding_tier: 'baseline',
    });

    return NextResponse.json({
      assetId: asset.id,
      playbackId: asset.playback_ids?.[0]?.id || null,
    });
  } catch (error: any) {
    console.error('Error creating Mux video:', error);
    return NextResponse.json(
      { error: error.message || 'Error creating video' },
      { status: 500 }
    );
  }
}