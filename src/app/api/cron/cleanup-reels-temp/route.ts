// ============================================================
// app/api/cron/cleanup-reels-temp/route.ts
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const MAX_AGE_MS = 60 * 60 * 1000; // 1 hora — tiempo de sobra para que Facebook ya haya procesado el Reel

export async function GET(req: NextRequest) {
  // Verifica que la llamada venga realmente de Vercel Cron y no de cualquiera
  // que adivine la URL
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const result = await cloudinary.api.resources({
      type: 'upload',
      resource_type: 'video',
      prefix: 'reels-temp/',
      max_results: 500,
    });

    const now = Date.now();
    const toDelete = (result.resources || []).filter((r: any) => {
      const createdAt = new Date(r.created_at).getTime();
      return now - createdAt > MAX_AGE_MS;
    });

    let deleted = 0;
    const errors: string[] = [];

    for (const resource of toDelete) {
      try {
        await cloudinary.uploader.destroy(resource.public_id, {
          resource_type: 'video',
          invalidate: true,
        });
        deleted++;
      } catch (err: any) {
        errors.push(`${resource.public_id}: ${err.message}`);
      }
    }

    console.log(`🧹 Limpieza reels-temp: ${result.resources?.length || 0} revisados, ${deleted} borrados.`);

    return NextResponse.json({
      checked: result.resources?.length || 0,
      deleted,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('❌ Error en limpieza de reels-temp:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}