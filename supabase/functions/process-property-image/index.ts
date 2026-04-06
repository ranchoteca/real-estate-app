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

    console.log(`🚀 Iniciando proceso para imagen: ${filePath}`);

    // ==========================================
    // PASO A: Obtener la imagen transformada vía Fetch Directo
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

    console.log(`URL de transformación generada: ${urlData.publicUrl}`);

    const imageResponse = await fetch(urlData.publicUrl);
    if (!imageResponse.ok) {
       const errorText = await imageResponse.text();
       throw new Error(`Fallo en ImgProxy (HTTP ${imageResponse.status}): ${errorText}`);
    }

    const compressedBlob = await imageResponse.blob();
    const mainImageBuffer = new Uint8Array(await compressedBlob.arrayBuffer());
    let finalImage = await decode(mainImageBuffer) as Image;

    // ==========================================
    // PASO B: Obtener Marcas de Agua (Con Supabase Download)
    // ==========================================
    // Usamos .download() en lugar de getPublicUrl + fetch para evitar problemas de permisos
    
    const { data: logoBlob, error: logoError } = await supabase.storage.from('watermarks').download(`${agentId}/logo.png`);
    if (logoError) {
      console.warn(`No se encontró logo para el agente ${agentId}:`, logoError.message);
    }

    const { data: centerBlob, error: centerError } = await supabase.storage.from('watermarks').download(`${agentId}/watermark.png`);
    if (centerError) {
      console.warn(`No se encontró marca de agua central para el agente ${agentId}:`, centerError.message);
    }

    // ==========================================
    // PASO C: Aplicar Marcas
    // ==========================================
    if (centerBlob) {
      const centerBuffer = new Uint8Array(await centerBlob.arrayBuffer())
      const centerWatermark = await decode(centerBuffer) as Image
      centerWatermark.opacity(0.3)
      const centerX = (finalImage.width / 2) - (centerWatermark.width / 2)
      const centerY = (finalImage.height / 2) - (centerWatermark.height / 2)
      finalImage.composite(centerWatermark, centerX, Math.max(0, centerY))
    }

    if (logoBlob) {
      const logoBuffer = new Uint8Array(await logoBlob.arrayBuffer())
      const logoImage = await decode(logoBuffer) as Image
      const padding = 20;
      const cornerX = finalImage.width - logoImage.width - padding
      const cornerY = finalImage.height - logoImage.height - padding
      finalImage.composite(logoImage, Math.max(0, cornerX), Math.max(0, cornerY))
    }

    // ==========================================
    // PASO D: Subir al Bucket Final
    // ==========================================
    const outputBuffer = await finalImage.encodeJPEG(80); 

    // Asegúrate de que el nombre del archivo termine en .jpg
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

    // ==========================================
    // PASO E: Auto-limpieza
    // ==========================================
    const { error: removeError } = await supabase.storage.from('temp-originals').remove([filePath]);
    if (removeError) {
        console.warn(`No se pudo borrar la imagen temporal: ${removeError.message}`);
    }

    console.log(`✅ Proceso completado exitosamente para: ${filePath}`);

    return new Response(JSON.stringify({ success: true, path: filePath }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("❌ Error CRÍTICO en Edge Function:", error);
    // Ahora sí enviamos el error real al panel de Logs
    return new Response(JSON.stringify({ error: error.message, stack: error.stack }), { status: 500 });
  }
})