import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"
// Librería ligera para procesar imágenes en Deno
import { Image, decode } from 'https://deno.land/x/imagescript@1.3.0/mod.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  try {
    // 1. Inicializar cliente de Supabase con permisos de administrador (Service Role)
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 2. Leer el payload del Webhook (El evento que dispara la subida)
    const payload = await req.json()
    const record = payload.record // Datos del archivo recién subido

    // Validar que venga del bucket correcto
    if (record.bucket_id !== 'temp-originals') {
      return new Response("Ignorado: No es el bucket temporal", { status: 200 })
    }

    const filePath = record.name; // Ej: "agent_123/property_456/foto1.jpg"
    // Extraer el ID del agente para saber dónde buscar sus marcas de agua
    const agentId = filePath.split('/')[0]; 

    console.log(`Procesando imagen: ${filePath}`);

    // ==========================================
    // PASO A: Descargar la imagen YA COMPRIMIDA (La Magia)
    // ==========================================
    const { data: compressedBlob, error: downloadError } = await supabase
      .storage
      .from('temp-originals')
      .download(filePath, {
        transform: {
          width: 1200,      // Achicamos a un tamaño web ideal
          quality: 80,      // Comprimimos
          format: 'webp',   // Formato ultra ligero
        },
      })

    if (downloadError || !compressedBlob) throw new Error("Error al descargar/comprimir imagen origen")
    
    // ==========================================
    // PASO B: Descargar Logo y Marca de Agua del agente
    // ==========================================
    // (Asumiendo que se llaman 'logo.png' y 'watermark.png' en su carpeta)
    const { data: logoBlob } = await supabase.storage.from('watermarks').download(`${agentId}/logo.png`)
    const { data: centerBlob } = await supabase.storage.from('watermarks').download(`${agentId}/watermark.png`)

    // Convertir los Blobs a Buffers para la librería de imágenes
    const mainImageBuffer = new Uint8Array(await compressedBlob.arrayBuffer())
    let finalImage = await decode(mainImageBuffer) as Image

    // ==========================================
    // PASO C: Aplicar Marcas (Si existen)
    // ==========================================
    
    // 1. Marca de agua central (con opacidad)
    if (centerBlob) {
      const centerBuffer = new Uint8Array(await centerBlob.arrayBuffer())
      const centerWatermark = await decode(centerBuffer) as Image
      
      // Ajustar la opacidad (ej. 30%)
      centerWatermark.opacity(0.3) 
      
      // Posicionar al centro
      const centerX = (finalImage.width / 2) - (centerWatermark.width / 2)
      const centerY = (finalImage.height / 2) - (centerWatermark.height / 2)
      
      finalImage.composite(centerWatermark, centerX, Math.max(0, centerY))
    }

    // 2. Logo en la esquina (ej. abajo a la derecha)
    if (logoBlob) {
      const logoBuffer = new Uint8Array(await logoBlob.arrayBuffer())
      const logoImage = await decode(logoBuffer) as Image
      
      const padding = 20;
      const cornerX = finalImage.width - logoImage.width - padding
      const cornerY = finalImage.height - logoImage.height - padding
      
      finalImage.composite(logoImage, Math.max(0, cornerX), Math.max(0, cornerY))
    }

    // ==========================================
    // PASO D: Exportar y subir al Bucket Final
    // ==========================================
    const outputBuffer = await finalImage.encode(3) // 3 es calidad WebP equivalente
    
    const { error: uploadError } = await supabase
      .storage
      .from('property-photos')
      .upload(filePath, outputBuffer, {
        contentType: 'image/webp',
        upsert: true
      })

    if (uploadError) throw new Error("Error subiendo al bucket final")

    // ==========================================
    // PASO E: Borrar el archivo pesado original (Auto-limpieza)
    // ==========================================
    await supabase.storage.from('temp-originals').remove([filePath])

    return new Response(JSON.stringify({ success: true, path: filePath }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    })

  } catch (error) {
    console.error("Error en Edge Function:", error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})