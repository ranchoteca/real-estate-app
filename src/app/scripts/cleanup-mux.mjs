import Mux from '@mux/mux-node';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID,
  tokenSecret: process.env.MUX_TOKEN_SECRET,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getActivePlaybackIds() {
  const { data, error } = await supabase
    .from('properties')
    .select('video_urls')
    .not('video_urls', 'eq', '{}')
    .not('video_urls', 'is', null);

  if (error) {
    console.error('❌ Error consultando Supabase:', error.message);
    process.exit(1);
  }

  const playbackIds = new Set();

  for (const property of data || []) {
    for (const url of property.video_urls || []) {
      // Extraer playback ID de la URL
      // https://stream.mux.com/PLAYBACK_ID/capped-1080p.mp4
      const match = url.match(/stream\.mux\.com\/([^/]+)/);
      if (match) {
        playbackIds.add(match[1]);
      }
    }
  }

  return playbackIds;
}

async function cleanup() {
  console.log('📋 Consultando Supabase para obtener playback IDs activos...');
  const activePlaybackIds = await getActivePlaybackIds();
  console.log(`✅ Playback IDs en uso: ${activePlaybackIds.size}`);
  activePlaybackIds.forEach(id => console.log(`   → ${id}`));

  console.log('\n🔍 Obteniendo todos los assets de Mux...');

  let allAssets = [];
  let page = 1;

  while (true) {
    const response = await mux.video.assets.list({ limit: 100, page });
    if (!response.data || response.data.length === 0) break;
    allAssets = [...allAssets, ...response.data];
    if (response.data.length < 100) break;
    page++;
  }

  console.log(`📊 Total assets en Mux: ${allAssets.length}`);

  let deleted = 0;
  let kept = 0;

  for (const asset of allAssets) {
    const playbackId = asset.playback_ids?.[0]?.id;

    if (activePlaybackIds.has(playbackId)) {
      console.log(`✅ Conservando: ${playbackId}`);
      kept++;
      continue;
    }

    try {
      await mux.video.assets.delete(asset.id);
      console.log(`🗑️ Eliminado asset: ${asset.id} (playbackId: ${playbackId || 'none'})`);
      deleted++;
    } catch (err) {
      console.log(`⚠️ Error eliminando ${asset.id}: ${err.message}`);
    }
  }

  console.log(`\n✅ Completado: ${deleted} eliminados, ${kept} conservados`);
}

cleanup().catch(console.error);

// Se ejecuta en vscode en local con este comando: node src/app/scripts/cleanup-mux.mjs
// Modo Dry-run, decirle a la IA que genere ese archivo porque esta su ruta pero
// no lo ha generado aún.

// Por ahora lo haremos sin dry-run

/*
# Ver qué se eliminaría sin eliminar nada
node src/app/scripts/cleanup-mux.mjs --dry-run

# Eliminar de verdad
node src/app/scripts/cleanup-mux.mjs
*/