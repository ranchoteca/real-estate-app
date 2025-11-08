import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import OpenAI from "openai";
import { v4 as uuidv4 } from "uuid";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { property, theme, logoUrl } = await req.json();
    const requestId = uuidv4();
    console.log(`[${requestId}] 🎨 Generando arte digital...`);

    const firstImageUrl = property?.images?.[0] || null;

    // 1️⃣ — GPT-5: generar y optimizar prompt
    const creativePrompt = `
Eres un diseñador gráfico experto en anuncios inmobiliarios para redes sociales.

Genera un prompt técnico y corto para DALL·E 3 (formato cuadrado 1:1),
que indique cómo diseñar un arte atractivo para Facebook Ads inmobiliario.

Datos:
- Tema: ${theme}
- Propiedad: ${property?.title || "Propiedad en venta"}
- Ubicación: ${property?.location || "Ubicación desconocida"}
- Precio: ${property?.price || "Precio no indicado"}
- Logo disponible: ${logoUrl ? "Sí" : "No"}
- Imagen base disponible: ${firstImageUrl ? "Sí" : "No"}

Instrucciones:
Si hay imagen base, el arte debe superponer textos y diseño sobre esa imagen real, 
manteniendo buena composición, contraste y legibilidad del texto.
Si no hay imagen base, crea un fondo visual coherente con el tema y estilo inmobiliario.

Devuelve solo el prompt final.
`;

    console.log(`[${requestId}] 🧠 Solicitando prompt a GPT-5...`);

    const gptResponse = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content:
            "Eres un experto en marketing visual y creación de prompts para imágenes publicitarias. Devuelve SOLO el prompt final optimizado.",
        },
        { role: "user", content: creativePrompt },
      ],
    });

    const optimizedPrompt =
      gptResponse.choices[0]?.message?.content?.trim() ||
      `${theme} visual para publicidad inmobiliaria`;

    console.log(`[${requestId}] ✅ Prompt optimizado:\n${optimizedPrompt}`);

    // 2️⃣ — DALL·E: renderizar arte (usando imagen base si existe)
    console.log(
      `[${requestId}] 🖼️ Solicitando render a gpt-image-1 ${
        firstImageUrl ? "con imagen base" : "sin imagen base"
      }...`
    );

    const imageResponse = await openai.images.generate({
      model: "gpt-image-1",
      prompt: optimizedPrompt,
      size: "1024x1024",
      n: 1,
      response_format: "b64_json",
      ...(firstImageUrl
        ? {
            image: firstImageUrl,
          }
        : {}),
    });

    const imageBase64 = imageResponse.data[0].b64_json;
    if (!imageBase64) throw new Error("No se recibió imagen del modelo.");

    // 3️⃣ — Convertir base64 a buffer binario
    const imageBuffer = Buffer.from(imageBase64, "base64");

    // 4️⃣ — Subir imagen a Supabase
    const fileName = `artes/${requestId}.png`;
    console.log(`[${requestId}] ☁️ Subiendo arte a Supabase: ${fileName}`);
    const { data, error: uploadError } = await supabaseAdmin.storage
      .from("public-assets")
      .upload(fileName, imageBuffer, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = supabaseAdmin.storage
      .from("public-assets")
      .getPublicUrl(fileName);

    console.log(`[${requestId}] ✅ Arte subido correctamente: ${publicUrl}`);

    // 5️⃣ — Respuesta final
    return NextResponse.json({
      success: true,
      imageUrl: publicUrl,
      prompt: optimizedPrompt,
      model: "gpt-image-1",
      usedBaseImage: Boolean(firstImageUrl),
      requestId,
    });
  } catch (error: any) {
    console.error("❌ Error generando arte:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error interno" },
      { status: 500 }
    );
  }
}
