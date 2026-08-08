// ============================================================
// app/api/cron/cleanup-whatsapp-drafts/route.ts
// ============================================================
// Runs once daily to clean up abandoned WhatsApp property creation drafts
// and their associated orphaned photos in Supabase Storage.
//
// A draft is considered abandoned if:
// - mode_active = true (never completed or cancelled)
// - updated_at is older than 24 hours
//
// Orphaned photos are files in property-photos bucket under draft-* folders
// that are older than 24 hours.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MAX_AGE_HOURS = 24;

export async function GET(req: NextRequest) {
  // Verify the request comes from Vercel Cron
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const results = {
    drafts: { checked: 0, deleted: 0, errors: [] as string[] },
    photos: { checked: 0, deleted: 0, errors: [] as string[] },
  };

  const cutoff = new Date(Date.now() - MAX_AGE_HOURS * 60 * 60 * 1000).toISOString();

  // ── 1. Clean up abandoned drafts ─────────────────────────────────────────────
  try {
    const { data: abandonedDrafts, error: fetchError } = await supabaseAdmin
      .from('agent_property_draft')
      .select('id, agent_id, photos')
      .eq('mode_active', true)
      .lt('updated_at', cutoff);

    if (fetchError) throw fetchError;

    results.drafts.checked = abandonedDrafts?.length || 0;

    for (const draft of abandonedDrafts || []) {
      try {
        await supabaseAdmin
          .from('agent_property_draft')
          .delete()
          .eq('id', draft.id);
        results.drafts.deleted++;
      } catch (err: any) {
        results.drafts.errors.push('draft ' + draft.id + ': ' + err.message);
      }
    }
  } catch (err: any) {
    console.error('❌ Error cleaning abandoned drafts:', err);
    results.drafts.errors.push(err.message);
  }

  // ── 2. Clean up orphaned draft photos in Supabase Storage ────────────────────
  // Photos uploaded during WhatsApp creation are stored under {agent_id}/draft-{id}/
  // If the draft was abandoned or cancelled, these files remain as orphans.
  try {
    // List all agent folders in property-photos bucket
    const { data: agentFolders, error: listError } = await supabaseAdmin.storage
      .from('property-photos')
      .list('', { limit: 200 });

    if (listError) throw listError;

    for (const folder of agentFolders || []) {
      // Each top-level folder is an agent_id
      const { data: subFolders } = await supabaseAdmin.storage
        .from('property-photos')
        .list(folder.name, { limit: 200 });

      for (const subFolder of subFolders || []) {
        // Draft folders are named draft-{agentId substring}
        if (!subFolder.name.startsWith('draft-')) continue;

        const folderPath = folder.name + '/' + subFolder.name;

        // List files in this draft folder
        const { data: files } = await supabaseAdmin.storage
          .from('property-photos')
          .list(folderPath, { limit: 200 });

        if (!files || files.length === 0) continue;

        results.photos.checked += files.length;

        // Check if files are older than MAX_AGE_HOURS
        const oldFiles = files.filter(function(f) {
          if (!f.created_at) return false;
          return new Date(f.created_at).getTime() < Date.now() - MAX_AGE_HOURS * 60 * 60 * 1000;
        });

        if (oldFiles.length === 0) continue;

        const pathsToDelete = oldFiles.map(function(f) {
          return folderPath + '/' + f.name;
        });

        const { error: deleteError } = await supabaseAdmin.storage
          .from('property-photos')
          .remove(pathsToDelete);

        if (deleteError) {
          results.photos.errors.push(folderPath + ': ' + deleteError.message);
        } else {
          results.photos.deleted += pathsToDelete.length;
        }
      }
    }
  } catch (err: any) {
    console.error('❌ Error cleaning orphaned photos:', err);
    results.photos.errors.push(err.message);
  }

  console.log('🧹 WhatsApp draft cleanup: drafts=' + JSON.stringify(results.drafts) + ' photos=' + JSON.stringify(results.photos));

  return NextResponse.json({
    drafts: {
      checked: results.drafts.checked,
      deleted: results.drafts.deleted,
      errors: results.drafts.errors.length > 0 ? results.drafts.errors : undefined,
    },
    photos: {
      checked: results.photos.checked,
      deleted: results.photos.deleted,
      errors: results.photos.errors.length > 0 ? results.photos.errors : undefined,
    },
  });
}