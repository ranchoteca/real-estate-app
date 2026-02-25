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
  throw new Error(`Timeout: asset not ready`);
}

async function getMp4Url(assetId: string, maxAttempts = 20, intervalMs = 3000): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const asset = await mux.video.assets.retrieve(assetId);
    
    const renditions = (asset as any).static_renditions;
    if (renditions?.status === 'ready' && renditions?.files?.length > 0) {
      // Tomar el archivo MP4 de mayor calidad disponible
      const mp4File = renditions.files.find((f: any) => f.ext === 'mp4') || renditions.files[0];
      const playbackId = asset.playback_ids?.[0]?.id;
      if (playbackId && mp4File) {
        const url = `https://stream.mux.com/${playbackId}/${mp4File.name}`;
        console.log(`✅ MP4 URL: ${url}`);
        return url;
      }
    }

    console.log(`⏳ Waiting for MP4... renditions status: ${renditions?.status} (${attempt + 1}/${maxAttempts})`);
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  throw new Error(`Timeout: MP4 not ready for asset ${assetId}`);
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

    // Esperar a que todos estén ready
    await Promise.all(assetIds.map((id: string) => waitForAssetReady(id)));

    // Obtener URLs MP4 de cada asset
    const mp4Urls = await Promise.all(assetIds.map((id: string) => getMp4Url(id)));
    console.log('✅ MP4 URLs:', mp4Urls);

    // Concatenar con Mux
    const concatenated = await mux.video.assets.create({
      input: mp4Urls.map(url => ({ url })),
      playback_policy: ['public'],
      encoding_tier: 'baseline',
    });

    // Esperar a que el asset concatenado esté ready
    await waitForAssetReady(concatenated.id);
    const finalAsset = await mux.video.assets.retrieve(concatenated.id);
    const playbackId = finalAsset.playback_ids?.[0]?.id;

    if (!playbackId) throw new Error('No playback ID on concatenated asset');

    console.log(`✅ Video concatenado listo: ${playbackId}`);

    return NextResponse.json({
      assetId: concatenated.id,
      playbackId,
    });

  } catch (error: any) {
    console.error('Error creating Mux video:', error);
    return NextResponse.json(
      { error: error.message || 'Error creating video' },
      { status: 500 }
    );
  }
}