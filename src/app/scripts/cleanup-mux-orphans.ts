import Mux from '@mux/mux-node';
import { createClient } from '@supabase/supabase-js';

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function cleanupOrphans() {
  console.log('🔍 Buscando videos huérfanos...');

  // Obtener todos los uploadIds registrados en propiedades
  const { data: properties } = await supabase
    .from('properties')
    .select('id, slug, mux_upload_ids, video_urls')
    .not('mux_upload_ids', 'eq', '{}');

  if (!properties || properties.length === 0) {
    console.log('✅ No hay propiedades con uploads registrados');
    return;
  }

  for (const property of properties) {
    console.log(`\n📋 Propiedad: ${property.slug}`);
    console.log(`   Upload IDs: ${property.mux_upload_ids}`);
    console.log(`   Video URLs: ${property.video_urls}`);

    // Si tiene uploadIds pero no video_urls, es un huérfano
    if (
      property.mux_upload_ids?.length > 0 &&
      (!property.video_urls || property.video_urls.length === 0)
    ) {
      console.log(`   ⚠️ HUÉRFANO DETECTADO`);

      for (const uploadId of property.mux_upload_ids) {
        try {
          const upload = await mux.video.uploads.retrieve(uploadId);
          if (upload.asset_id) {
            await mux.video.assets.delete(upload.asset_id);
            console.log(`   🗑️ Asset ${upload.asset_id} eliminado`);
          }
        } catch (err) {
          console.log(`   ℹ️ Upload ${uploadId} ya no existe en Mux`);
        }
      }

      // Limpiar los uploadIds de la propiedad
      await supabase
        .from('properties')
        .update({ mux_upload_ids: [] })
        .eq('id', property.id);

      console.log(`   ✅ Propiedad limpiada`);
    }
  }

  console.log('\n✅ Limpieza completada');
}

cleanupOrphans().catch(console.error);

// Este script lo corres manualmente en local en vscode porque vercel gratuito no lo permite,
// cuando quieras limpiar videos huérfanos en MUX: npx ts-node src/app/scripts/cleanup-mux-orphans.ts
// 