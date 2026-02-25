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
    return NextResponse.json({
      status: upload.status,
      assetId: upload.asset_id ?? null,
    });
  } catch (error: any) {
    console.error('Error retrieving Mux upload:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}