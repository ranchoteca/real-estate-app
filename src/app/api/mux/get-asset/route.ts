import { NextRequest, NextResponse } from 'next/server';
import Mux from '@mux/mux-node';

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const uploadId = searchParams.get('uploadId');

  if (!uploadId) {
    return NextResponse.json({ error: 'uploadId required' }, { status: 400 });
  }

  try {
    const upload = await mux.video.uploads.retrieve(uploadId);
    
    let assetStatus = null;
    let playbackId = null;

    // Si ya existe el asset_id, buscamos el Asset real para ver su estado
    if (upload.asset_id) {
      const asset = await mux.video.assets.retrieve(upload.asset_id);
      assetStatus = asset.status; // Esto devolverá 'preparing', 'ready' o 'errored'
      playbackId = asset.playback_ids?.[0]?.id || null;
    }

    return NextResponse.json({
      uploadStatus: upload.status,
      assetStatus: assetStatus,
      assetId: upload.asset_id ?? null,
      playbackId: playbackId,
    });
  } catch (error: any) {
    console.error('Error retrieving Mux upload:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}