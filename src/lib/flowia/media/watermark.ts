import sharp from 'sharp';

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

// Size map matching the app's watermark page
const LOGO_SIZE_MAP: Record<string, number> = {
  small: 0.10,
  medium: 0.15,
  large: 0.22,
};

export async function applyWatermark(
  imageBuffer: Buffer,
  config: AgentWatermarkConfig
): Promise<Buffer> {
  try {
    const { width, height } = await sharp(imageBuffer).metadata();
    if (!width || !height) return imageBuffer;

    // Resize to max 1920px on longest side (same as app)
    let pipeline = sharp(imageBuffer).resize(1920, 1920, {
      fit: 'inside',
      withoutEnlargement: true,
    });

    const resizedBuffer = await pipeline.toBuffer();
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
        const logoRes = await fetch(logoUrl);
        const logoBuffer = Buffer.from(await logoRes.arrayBuffer());
        const resizedLogo = await sharp(logoBuffer)
          .resize(logoW, undefined, { fit: 'inside' })
          .toBuffer();
        const { width: lw, height: lh } = await sharp(resizedLogo).metadata();
        if (lw && lh) {
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
        const wmRes = await fetch(config.watermark_image);
        const wmBuffer = Buffer.from(await wmRes.arrayBuffer());

        // Apply opacity via raw pixel manipulation
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
          const left = Math.round((rw - wmFinalW) / 2);
          const top = Math.round((rh - wmFinalH) / 2);
          compositeOps.push({ input: wmWithOpacity, left, top });
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