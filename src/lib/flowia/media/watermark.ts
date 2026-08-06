import sharp from 'sharp';
import { supabaseAdmin } from '@/lib/supabase';

// Applies watermark and corner logo to a photo buffer,
// respecting the agent's settings from the agents table.
// Mirrors the logic in /api/property/upload-photos exactly.

interface AgentWatermarkConfig {
  watermark_logo?: string | null;
  watermark_position?: string | null;
  watermark_size?: string | null;
  watermark_image?: string | null;
  watermark_opacity?: number | null;
  watermark_scale?: number | null;
  use_corner_logo?: boolean | null;
  use_watermark?: boolean | null;
}

const DEFAULT_FLOWESTATEAI_LOGO = 'https://uqgpottwgputiymlzojj.supabase.co/storage/v1/object/public/watermarks/default/flowestateai-logo.png';

const LOGO_SIZE_MAP: Record<string, number> = {
  small: 0.10,
  medium: 0.15,
  large: 0.22,
};

// Downloads a file from a URL — uses Supabase Storage client for Supabase URLs
// to avoid authentication issues in the serverless environment.
async function downloadBuffer(url: string): Promise<Buffer> {
  const supabaseStorageBase = 'supabase.co/storage/v1/object/public/';

  if (url.includes(supabaseStorageBase)) {
    // Extract bucket and path from URL: .../object/public/{bucket}/{path}
    const afterPublic = url.split(supabaseStorageBase)[1];
    const slashIdx = afterPublic.indexOf('/');
    const bucket = afterPublic.substring(0, slashIdx);
    const path = afterPublic.substring(slashIdx + 1);

    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .download(path);

    if (error || !data) {
      throw new Error('Supabase storage download failed: ' + (error?.message || 'no data'));
    }

    return Buffer.from(await data.arrayBuffer());
  }

  // External URL — use fetch
  const res = await fetch(url);
  if (!res.ok) throw new Error('Fetch failed: ' + res.status);
  return Buffer.from(await res.arrayBuffer());
}

export async function applyWatermark(
  imageBuffer: Buffer,
  config: AgentWatermarkConfig
): Promise<Buffer> {
  try {
    const { width, height } = await sharp(imageBuffer).metadata();
    if (!width || !height) return imageBuffer;

    // Resize to max 1920px on longest side (same as app)
    const resizedBuffer = await sharp(imageBuffer)
      .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
      .toBuffer();

    const { width: rw, height: rh } = await sharp(resizedBuffer).metadata();
    if (!rw || !rh) return resizedBuffer;

    const compositeOps: sharp.OverlayOptions[] = [];

    // ── Corner logo ────────────────────────────────────────────────────────────
    if (config.use_corner_logo !== false) {
      const logoUrl = config.watermark_logo || DEFAULT_FLOWESTATEAI_LOGO;
      const sizeKey = config.watermark_size || 'medium';
      const logoRatio = LOGO_SIZE_MAP[sizeKey] || 0.15;
      const logoW = Math.round(rw * logoRatio);

      try {
        const logoBuffer = await downloadBuffer(logoUrl);
        const resizedLogo = await sharp(logoBuffer)
          .resize(logoW, undefined, { fit: 'inside' })
          .toBuffer();
        const { width: lw, height: lh } = await sharp(resizedLogo).metadata();
        if (lw && lh && lw <= rw && lh <= rh) {
          // Only composite if logo fits within base image
          const margin = Math.round(rw * 0.02);
          const position = config.watermark_position || 'bottom-right';
          const left = position.includes('right') ? rw - lw - margin : margin;
          const top = position.includes('bottom') ? rh - lh - margin : margin;
          compositeOps.push({ input: resizedLogo, left, top });
        }
      } catch (err) {
        console.error('[watermark] Failed to apply corner logo:', err);
      }
    }

    // ── Center watermark image ─────────────────────────────────────────────────
    if (config.use_watermark && config.watermark_image) {
      const opacity = (config.watermark_opacity ?? 30) / 100;
      const scale = (config.watermark_scale ?? 50) / 100;
      const wmW = Math.round(rw * scale);

      try {
        const wmBuffer = await downloadBuffer(config.watermark_image);

        const { data, info } = await sharp(wmBuffer)
          .resize(wmW, undefined, { fit: 'inside' })
          .ensureAlpha()
          .raw()
          .toBuffer({ resolveWithObject: true });

        // Multiply alpha channel by opacity
        for (let i = 3; i < data.length; i += 4) {
          data[i] = Math.round(data[i] * opacity);
        }

        const wmWithOpacity = await sharp(data, {
          raw: { width: info.width, height: info.height, channels: 4 },
        }).png().toBuffer();

        const { width: wmFinalW, height: wmFinalH } = await sharp(wmWithOpacity).metadata();
        if (wmFinalW && wmFinalH) {
          // Clamp: watermark must never exceed base image dimensions
          if (wmFinalW <= rw && wmFinalH <= rh) {
            const left = Math.round((rw - wmFinalW) / 2);
            const top = Math.round((rh - wmFinalH) / 2);
            compositeOps.push({ input: wmWithOpacity, left, top });
          } else {
            // Resize watermark to fit within base image
            const maxScale = Math.min(rw / wmFinalW, rh / wmFinalH) * 0.9;
            const clampedW = Math.round(wmFinalW * maxScale);
            const clampedH = Math.round(wmFinalH * maxScale);
            const clamped = await sharp(wmWithOpacity).resize(clampedW, clampedH).toBuffer();
            const left = Math.round((rw - clampedW) / 2);
            const top = Math.round((rh - clampedH) / 2);
            compositeOps.push({ input: clamped, left, top });
          }
        }
      } catch (err) {
        console.error('[watermark] Failed to apply watermark image:', err);
      }
    }

    if (compositeOps.length === 0) return resizedBuffer;

    return await sharp(resizedBuffer).composite(compositeOps).jpeg({ quality: 85 }).toBuffer();
  } catch (err) {
    console.error('[watermark] Unexpected error, returning original buffer:', err);
    return imageBuffer;
  }
}