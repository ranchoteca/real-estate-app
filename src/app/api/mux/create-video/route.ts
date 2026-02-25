import { NextRequest, NextResponse } from 'next/server';
import Mux from '@mux/mux-node';
import { getServerSession } from 'next-auth';

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
});

async function waitForAssetReady(assetId: string, maxAttempts = 40, intervalMs = 3000): Promise<void> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const asset = await mux.video.assets.retrieve(assetId);
    if (asset.status === 'ready') return;
    if (asset.status === 'errored') throw new Error(`Asset ${assetId} errored`);
    console.log(`⏳ Asset ${assetId}: ${asset.status} (${attempt + 1}/${maxAttempts})`);
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  throw new Error(`Timeout: asset ${assetId} no estuvo ready`);
}

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

    console.log(`🎬 Concatenating ${assetIds.length} assets:`, assetIds);

    // Esperar a que todos los assets estén ready
    await Promise.all(assetIds.map((id: string) => waitForAssetReady(id)));

    // Obtener playbackId de cada asset para usarlo como input
    const assetDetails = await Promise.all(
      assetIds.map((id: string) => mux.video.assets.retrieve(id))
    );

    const inputs = assetDetails.map((asset) => {
      const playbackId = asset.playback_ids?.[0]?.id;
      if (!playbackId) throw new Error(`Asset ${asset.id} no tiene playback ID`);
      return { url: `https://stream.mux.com/${playbackId}.m3u8` };
    });

    const concatenatedAsset = await mux.video.assets.create({
      input: inputs,
      playback_policy: ['public'],
      encoding_tier: 'baseline',
    });

    return NextResponse.json({
      assetId: concatenatedAsset.id,
      playbackId: concatenatedAsset.playback_ids?.[0]?.id || null,
    });

  } catch (error: any) {
    console.error('Error creating Mux video:', error);
    return NextResponse.json({ error: error.message || 'Error creating video' }, { status: 500 });
  }
}