import { NextRequest, NextResponse } from 'next/server';
import Mux from '@mux/mux-node';

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const playbackId = searchParams.get('playbackId');

  if (!playbackId) {
    return NextResponse.json({ error: 'playbackId required' }, { status: 400 });
  }

  try {
    // Buscar el asset por playbackId
    const assets = await mux.video.assets.list();
    const asset = assets.data.find(a => 
      a.playback_ids?.some(p => p.id === playbackId)
    );

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Obtener static renditions
    const staticRenditions = asset.static_renditions;
    if (!staticRenditions?.files || staticRenditions.files.length === 0) {
      return NextResponse.json({ error: 'No static renditions available' }, { status: 404 });
    }

    // Tomar la mejor calidad disponible
    const file = staticRenditions.files[0];
    const downloadUrl = `https://stream.mux.com/${playbackId}/${file.name}`;

    return NextResponse.json({ downloadUrl });
  } catch (error: any) {
    console.error('Error getting download URL:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}