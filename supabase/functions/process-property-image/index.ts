import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"
import { Image, decode } from 'https://deno.land/x/imagescript@1.3.0/mod.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const payload = await req.json()
    const record = payload.record

    if (record.bucket_id !== 'temp-originals') {
      return new Response("Ignorado: No es el bucket temporal", { status: 200 })
    }

    const filePath = record.name;
    const agentId = filePath.split('/')[0];

    // ==========================================
    // PASO A: Obtener la imagen transformada
    // ==========================================
    const { data: urlData } = supabase
      .storage
      .from('temp-originals')
      .getPublicUrl(filePath, {
        transform: {
          width: 1200,
          quality: 80,
          resize: 'contain'
        },
      });

    const imageResponse = await fetch(urlData.publicUrl);
    if (!imageResponse.ok) throw new Error(`Fallo en ImgProxy`);

    const compressedBlob = await imageResponse.blob();
    const mainImageBuffer = new Uint8Array(await compressedBlob.arrayBuffer());
    let finalImage = await decode(mainImageBuffer) as Image;

    // ==========================================
    // PASO B: Consultar Configuración Exacta (Añadí position y size)
    // ==========================================
    const { data: agentSettings, error: dbError } = await supabase
      .from('agents')
      // Añadimos watermark_position y watermark_size a la consulta
      .select('use_corner_logo, watermark_logo, watermark_position, watermark_size, use_watermark, watermark_image, watermark_opacity, watermark_scale')
      .eq('id', agentId)
      .single();

    let logoBlob = null;
    let centerBlob = null;
    
    // Variables por defecto
    let opacity = 0.3; 
    let scalePercentage = 0.5; 
    let logoPosition = 'bottom-right';
    let logoSize = 'medium';

    if (agentSettings && !dbError) {
      if (agentSettings.watermark_opacity) opacity = agentSettings.watermark_opacity / 100;
      if (agentSettings.watermark_scale) scalePercentage = agentSettings.watermark_scale / 100;
      
      // Capturamos las preferencias del logo
      if (agentSettings.watermark_position) logoPosition = agentSettings.watermark_position;
      if (agentSettings.watermark_size) logoSize = agentSettings.watermark_size;

      // Descargar Logo
      if (agentSettings.use_corner_logo && agentSettings.watermark_logo) {
        try {
            if (agentSettings.watermark_logo.startsWith('http')) {
                const res = await fetch(agentSettings.watermark_logo);
                if (res.ok) logoBlob = await res.blob();
            } else {
                const { data } = await supabase.storage.from('watermarks').download(agentSettings.watermark_logo);
                logoBlob = data;
            }
        } catch (e) { console.warn("No se pudo descargar el logo esquinero"); }
      }

      // Descargar Marca de Agua Central
      if (agentSettings.use_watermark && agentSettings.watermark_image) {
        try {
            if (agentSettings.watermark_image.startsWith('http')) {
                const res = await fetch(agentSettings.watermark_image);
                if (res.ok) centerBlob = await res.blob();
            } else {
                const { data } = await supabase.storage.from('watermarks').download(agentSettings.watermark_image);
                centerBlob = data;
            }
        } catch (e) { console.warn("No se pudo descargar la marca de agua central"); }
      }
    }

    // ==========================================
    // PASO C: Aplicar Marcas
    // ==========================================
    
    // 1. MARCA DE AGUA CENTRAL (¡INTOCABLE! Hace su magia como antes)
    if (centerBlob) {
      const centerBuffer = new Uint8Array(await centerBlob.arrayBuffer())
      let centerWatermark = await decode(centerBuffer) as Image
      
      const targetWidth = Math.floor(finalImage.width * scalePercentage);
      const ratio = targetWidth / centerWatermark.width;
      centerWatermark.resize(targetWidth, Math.floor(centerWatermark.height * ratio));

      centerWatermark.opacity(opacity);
      
      const centerX = Math.floor((finalImage.width / 2) - (centerWatermark.width / 2))
      const centerY = Math.floor((finalImage.height / 2) - (centerWatermark.height / 2))
      finalImage.composite(centerWatermark, Math.max(0, centerX), Math.max(0, centerY))
    }

    // 2. LOGO ESQUINERO (NUEVA LÓGICA DINÁMICA)
    if (logoBlob) {
      const logoBuffer = new Uint8Array(await logoBlob.arrayBuffer())
      let logoImage = await decode(logoBuffer) as Image
      
      // A. Definir el Tamaño (Porcentajes basados en el ancho de la foto)
      let sizeMultiplier = 0.15; // medium
      if (logoSize === 'small') sizeMultiplier = 0.08; // 8%
      if (logoSize === 'large') sizeMultiplier = 0.25; // 25%

      const targetLogoWidth = Math.floor(finalImage.width * sizeMultiplier);
      const logoRatio = targetLogoWidth / logoImage.width;
      logoImage.resize(targetLogoWidth, Math.floor(logoImage.height * logoRatio));

      // B. Definir la Posición
      const padding = 20;
      let cornerX = 0;
      let cornerY = 0;

      switch (logoPosition) {
        case 'top-left':
          cornerX = padding;
          cornerY = padding;
          break;
        case 'top-right':
          cornerX = finalImage.width - logoImage.width - padding;
          cornerY = padding;
          break;
        case 'bottom-left':
          cornerX = padding;
          cornerY = finalImage.height - logoImage.height - padding;
          break;
        case 'bottom-right':
        default:
          cornerX = finalImage.width - logoImage.width - padding;
          cornerY = finalImage.height - logoImage.height - padding;
          break;
      }

      finalImage.composite(logoImage, Math.max(0, cornerX), Math.max(0, cornerY))
    }

    // ==========================================
    // PASO D: Subir al Bucket Final (.jpg)
    // ==========================================
    const outputBuffer = await finalImage.encodeJPEG(80); 

    let finalPath = filePath;
    if (finalPath.endsWith('.webp') || finalPath.endsWith('.png')) {
        finalPath = finalPath.replace(/\.(webp|png)$/i, '.jpg');
    }

    const { error: uploadError } = await supabase
      .storage
      .from('property-photos')
      .upload(finalPath, outputBuffer, {
        contentType: 'image/jpeg', 
        upsert: true
      });

    if (uploadError) throw uploadError;

    // ==========================================
    // PASO E: Auto-limpieza
    // ==========================================
    await supabase.storage.from('temp-originals').remove([filePath]);

    return new Response(JSON.stringify({ success: true, path: filePath }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("❌ Error en Edge Function:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
})