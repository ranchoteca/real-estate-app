import OpenAI from 'openai';
import { supabaseAdmin } from '@/lib/supabase';
import { sendQueued } from '@/lib/api/wasender';
import { decryptWasenderMedia, extractMediaInfo } from '../media/decrypt';
import { uploadPhotoFromUrl } from '../media/upload-photo';
import { transcribeAudioFromUrl } from '../media/transcribe-audio';
import { BASE_DOMAIN, PHOTO_MIN, PHOTO_MAX } from '../constants';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PropertyDraft {
  title?: string;
  description?: string;
  price?: number;
  currency_id?: string;
  city?: string;
  address?: string;
  state_province?: string;
  property_type?: string;
  listing_type?: string;
  language?: string;
  maps_url?: string;
  latitude?: number;
  longitude?: number;
  photos: string[];               // Supabase Storage URLs already uploaded
  pending_photos: number;         // photo count for tracking
  processed_media_ids?: string[]; // messageIds already handled (prevents gallery race conditions)
}

// ─── Draft CRUD ───────────────────────────────────────────────────────────────

export async function getDraft(agentId: string): Promise<PropertyDraft | null> {
  const { data } = await supabaseAdmin
    .from('agent_property_draft')
    .select('*')
    .eq('agent_id', agentId)
    .eq('mode_active', true)
    .maybeSingle();

  return data || null;
}

export async function upsertDraft(agentId: string, fields: Partial<PropertyDraft>) {
  const { data: existing } = await supabaseAdmin
    .from('agent_property_draft')
    .select('id')
    .eq('agent_id', agentId)
    .maybeSingle();

  if (existing) {
    await supabaseAdmin
      .from('agent_property_draft')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('agent_id', agentId);
  } else {
    await supabaseAdmin
      .from('agent_property_draft')
      .insert({ agent_id: agentId, photos: [], mode_active: true, ...fields });
  }
}

// Deletes the draft on success — clean state for next property creation
export async function clearDraft(agentId: string) {
  await supabaseAdmin
    .from('agent_property_draft')
    .delete()
    .eq('agent_id', agentId);
}

// Keeps the draft on failure with mode_active=false for debugging via last_error
export async function failDraft(agentId: string, errorMessage: string) {
  await supabaseAdmin
    .from('agent_property_draft')
    .update({ mode_active: false, last_error: errorMessage })
    .eq('agent_id', agentId);
}

// ─── Mode entry ───────────────────────────────────────────────────────────────

export async function handleIniciarCreacion(
  agentId: string,
  cleanNumber: string,
  primerNombre: string
) {
  // Delete any stale draft before starting fresh (handles abandoned flows)
  await supabaseAdmin
    .from('agent_property_draft')
    .delete()
    .eq('agent_id', agentId);

  await upsertDraft(agentId, { photos: [], pending_photos: 0 });

  const mensaje = `¡Perfecto ${primerNombre}! 🏠 Vamos a crear una nueva propiedad.

Puedes enviarme la información en el orden que prefieras — *por escrito o por audio* 🎤. Estos son los campos que necesito:

📌 *Título* de la propiedad
💰 *Precio* y *divisa* (USD o CRC)
🏷️ *Tipo* (Casa, Apartamento, Finca, Local Comercial, etc.)
📋 *Tipo de negocio* (Venta o Alquiler)
🌍 *Provincia*, *ciudad* y *dirección*
📍 *Link de Google Maps* de la ubicación
📝 *Descripción* de la propiedad
🌐 *Idioma* (Español o Inglés)
🖼️ *Fotos* (mínimo ${PHOTO_MIN}, máximo ${PHOTO_MAX} imágenes)

_Puedes enviar cada dato por separado o todo junto, en el orden que quieras._
Cuando termines, escribe *LISTO* y yo verificaré todo antes de crear la propiedad.`;

  await sendQueued(agentId, cleanNumber, mensaje);
}

// ─── Media handling inside CREAR_PROPIEDAD mode ───────────────────────────────

export async function handleMediaEnDraft(
  agentId: string,
  cleanNumber: string,
  messageId: string,
  message: Record<string, any>
): Promise<string | null> {
  const mediaInfo = extractMediaInfo(message);
  if (!mediaInfo) return null;

  if (mediaInfo.type === 'image') {
    try {
      // Dedup by messageId — WhatsApp galleries fire multiple webhooks near-simultaneously.
      // Using messageId (not messageBody) avoids filtering them as text duplicates.
      const { data: draftRaw } = await supabaseAdmin
        .from('agent_property_draft')
        .select('processed_media_ids, photos')
        .eq('agent_id', agentId)
        .maybeSingle();

      const processedIds: string[] = draftRaw?.processed_media_ids || [];
      if (processedIds.includes(messageId)) {
        console.log(`⏭️ Media ${messageId} already processed, skipping.`);
        return null;
      }

      const { publicUrl } = await decryptWasenderMedia(messageId, mediaInfo.messageObject);

      // Re-read draft right before writing to minimize race condition window
      // when multiple gallery photos arrive simultaneously
      const draft = await getDraft(agentId);
      const currentPhotos = draft?.photos || [];
      const index = currentPhotos.length;

      if (index >= PHOTO_MAX) {
        return `Ya tienes ${PHOTO_MAX} fotos que es el máximo permitido. ✅`;
      }

      const tempSlug = `draft-${agentId.substring(0, 8)}`;
      const supabaseUrl = await uploadPhotoFromUrl(agentId, tempSlug, publicUrl, index);

      const updatedPhotos = [...currentPhotos, supabaseUrl];
      const updatedIds = [...processedIds, messageId];

      // Atomic update: photos array + processed IDs in a single write
      await upsertDraft(agentId, { photos: updatedPhotos, processed_media_ids: updatedIds });

      const count = updatedPhotos.length;
      const faltanMensaje = count < PHOTO_MIN ? ` (necesito al menos ${PHOTO_MIN})` : ' ✅';
      return `📸 Foto ${count} recibida${faltanMensaje}`;
    } catch (error) {
      console.error('Error processing image in draft:', error);
      return '❌ Tuve un problema procesando esa foto. Intenta enviarla de nuevo.';
    }
  }

  if (mediaInfo.type === 'audio') {
    try {
      const { publicUrl } = await decryptWasenderMedia(messageId, mediaInfo.messageObject);
      const transcripcion = await transcribeAudioFromUrl(publicUrl);

      // Save transcription as a user message so the extractor sees it in history.
      // Without this, audio content is lost when LISTO is processed.
      await supabaseAdmin
        .from('chat_messages')
        .insert({ agent_id: agentId, role: 'user', content: transcripcion });

      return `🎙️ _Audio transcrito:_ ${transcripcion}`;
    } catch (error) {
      console.error('Error transcribing audio in draft:', error);
      return '❌ No pude transcribir ese audio. Intenta enviarlo de nuevo o escribe el mensaje.';
    }
  }

  return null;
}

// ─── LISTO command handler ────────────────────────────────────────────────────

export async function handleListo(
  agentId: string,
  cleanNumber: string,
  primerNombre: string,
  history: Array<{ role: string; content: string }>
) {
  const draft = await getDraft(agentId);

  // Hard requirement: at least PHOTO_MIN photos before proceeding
  const photoCount = draft?.photos?.length || 0;
  if (photoCount < PHOTO_MIN) {
    await sendQueued(agentId, 
      cleanNumber,
      `⚠️ Aún necesito al menos *${PHOTO_MIN} fotos* para crear la propiedad. Actualmente tienes *${photoCount}*. Envíalas y escribe LISTO de nuevo.`
    );
    return;
  }

  await sendQueued(agentId, cleanNumber, '⏳ Analizando la información que me enviaste...');

  // Seed the extractor with data already confirmed in previous LISTO rounds.
  // This prevents losing fields when the agent sends corrections and writes LISTO again.
  const draftActual = {
    title: draft.title || null,
    description: draft.description || null,
    price: draft.price || null,
    currency_id: draft.currency_id || null,
    city: draft.city || null,
    address: draft.address || null,
    state_province: draft.state_province || null,
    property_type: draft.property_type || null,
    listing_type: draft.listing_type || null,
    language: draft.language || null,
    maps_url: draft.maps_url || null,
  };

  // Extract all fields from chat history using GPT-4o at temperature 0 for consistency.
  // The prompt merges previously confirmed draft data with new messages from history.
  const extractionPrompt = `Eres un extractor de datos para fichas de propiedades inmobiliarias.
Analiza el historial de conversación y extrae los campos de la propiedad.
Devuelve ÚNICAMENTE un JSON válido sin texto adicional ni backticks.

IMPORTANTE: Ya tienes estos datos confirmados de rondas anteriores. Úsalos como base y solo sobreescribe si el agente envió información más reciente o corregida:
${JSON.stringify(draftActual, null, 2)}

Campos a extraer (combinando lo anterior con lo nuevo del historial):
{
  "title": "string o null",
  "description": "string o null",
  "price": number o null,
  "currency_id": "839f44d5-bee2-4bc1-b5da-50364f14c681 para USD o ec8528a3-d504-47fa-97db-2c07716d8b47 para CRC, o null",
  "city": "string o null",
  "address": "string o null",
  "state_province": "string o null (provincia de Costa Rica)",
  "property_type": "house | apartment | land | commercial | other",
  "listing_type": "sale | rent",
  "language": "es | en",
  "maps_url": "string o null (link de Google Maps compartido por el agente)",
  "campos_faltantes": ["lista de campos obligatorios que aún faltan"]
}

Campos obligatorios: title, description, price, currency_id, city, property_type, listing_type, language.
El link de Google Maps (maps_url) también es obligatorio — agrégalo a campos_faltantes si no aparece en el historial.
state_province y address son opcionales pero deseables.`;

  const messagesForExtraction = [
    { role: 'system' as const, content: extractionPrompt },
    ...history.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user' as const, content: 'Extrae los datos de la propiedad combinando el draft anterior con el historial.' },
  ];

  let extractedData: any = null;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: messagesForExtraction,
      temperature: 0,
    });

    const raw = completion.choices[0].message.content || '{}';
    const clean = raw.replace(/```json|```/g, '').trim();
    extractedData = JSON.parse(clean);
  } catch (error) {
    console.error('Error extracting property data:', error);
    await sendQueued(agentId, 
      cleanNumber,
      '❌ Tuve un problema analizando la información. Por favor intenta de nuevo o escribe los datos más claramente.'
    );
    return;
  }

  // If required fields are still missing, ask for them without closing the mode
  const camposFaltantes: string[] = extractedData.campos_faltantes || [];
  if (camposFaltantes.length > 0) {
    const lista = camposFaltantes.map(c => `• ${c}`).join('\n');
    await sendQueued(agentId, 
      cleanNumber,
      `⚠️ Faltan algunos datos para poder crear la propiedad:\n\n${lista}\n\nEnvíalos y escribe *LISTO* de nuevo cuando estés listo.`
    );
    return;
  }

  // Persist extracted fields to draft so they survive subsequent LISTO rounds
  await upsertDraft(agentId, {
    title: extractedData.title,
    description: extractedData.description,
    price: extractedData.price,
    currency_id: extractedData.currency_id,
    city: extractedData.city,
    address: extractedData.address,
    state_province: extractedData.state_province,
    property_type: extractedData.property_type,
    listing_type: extractedData.listing_type,
    language: extractedData.language,
    maps_url: extractedData.maps_url,
  });

  // Build confirmation summary for the agent to review before creating
  const divisa = extractedData.currency_id === '839f44d5-bee2-4bc1-b5da-50364f14c681' ? 'USD' : 'CRC';
  const tipoMap: Record<string, string> = {
    house: 'Casa', apartment: 'Apartamento', land: 'Terreno/Finca',
    commercial: 'Local Comercial', other: 'Otro',
  };
  const negocioMap: Record<string, string> = { sale: 'Venta', rent: 'Alquiler' };

  const resumen = `✅ *Resumen de la propiedad a crear:*

📌 *Título:* ${extractedData.title}
🏷️ *Tipo:* ${tipoMap[extractedData.property_type] || extractedData.property_type}
📋 *Negocio:* ${negocioMap[extractedData.listing_type] || extractedData.listing_type}
💰 *Precio:* ${extractedData.price?.toLocaleString('es-CR')} ${divisa}
📍 *Provincia:* ${extractedData.state_province || 'No indicada'}
🌆 *Ciudad:* ${extractedData.city}
🏠 *Dirección:* ${extractedData.address || 'No indicada'}
📍 *Google Maps:* ${extractedData.maps_url || 'No indicado'}
🌐 *Idioma:* ${extractedData.language === 'es' ? 'Español' : 'Inglés'}
🖼️ *Fotos:* ${photoCount}

¿Todo correcto? Responde *SÍ* para crear la propiedad, o corrígeme lo que esté mal.`;

  await sendQueued(agentId, cleanNumber, resumen);
  await upsertDraft(agentId, { pending_photos: photoCount });
}

// ─── SÍ confirmation handler ──────────────────────────────────────────────────

export async function handleConfirmacion(
  agentId: string,
  cleanNumber: string,
  primerNombre: string
) {
  const draft = await getDraft(agentId);

  if (!draft) {
    await sendQueued(agentId, cleanNumber, '❌ No encontré información de la propiedad. Por favor inicia el proceso de nuevo.');
    return;
  }

  await sendQueued(agentId, 
    cleanNumber,
    `⏳ Perfecto ${primerNombre}, estoy creando tu propiedad. Te aviso cuando esté lista.`
  );

  // Close the mode immediately so the agent can use the bot normally while we work
  await clearDraft(agentId);

  // Fire-and-forget: create the property in the background
  setImmediate(async () => {
    await crearPropiedadEnBackground(agentId, cleanNumber, draft);
  });
}

// ─── Background property creation ────────────────────────────────────────────

async function crearPropiedadEnBackground(
  agentId: string,
  cleanNumber: string,
  draft: PropertyDraft
) {
  try {
    // Normalize title to produce clean slugs (removes accents before lowercasing)
    const baseSlug = (draft.title || 'propiedad')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const slug = `${baseSlug}-${Date.now().toString(36)}`;

    // Insert directly via supabaseAdmin — same pattern as all other webhook DB calls,
    // no need for an HTTP roundtrip to /api/property/create
    const { data: property, error: propertyError } = await supabaseAdmin
      .from('properties')
      .insert({
        agent_id: agentId,
        title: draft.title,
        description: draft.description,
        price: draft.price,
        currency_id: draft.currency_id,
        city: draft.city,
        address: draft.address,
        state: draft.state_province,
        property_type: draft.property_type || 'house',
        listing_type: draft.listing_type || 'sale',
        language: draft.language || 'es',
        latitude: draft.latitude || null,
        longitude: draft.longitude || null,
        plus_code: null,
        photos: draft.photos,
        // 'pending' maps to the "Pendiente" status in the app (draft/under review)
        status: 'pending',
        slug,
        show_map: !!draft.maps_url,
        custom_fields_data: {},
      })
      .select('id, slug')
      .single();

    if (propertyError || !property) {
      throw new Error(propertyError?.message || 'Unknown error inserting property');
    }

    const editUrl = `${BASE_DOMAIN}/dashboard/properties/${property.slug}/edit`;
    const shareUrl = `${BASE_DOMAIN}/p/${property.slug}`;

    await sendQueued(agentId, 
      cleanNumber,
      `✅ ¡Tu propiedad fue creada exitosamente!\n\n*${draft.title}*\n\n✏️ *Editar y agregar videos:*\n${editUrl}\n\n🔗 *Link para compartir con clientes:*\n${shareUrl}`
    );
  } catch (error: any) {
    console.error('Error creating property in background:', error);

    // Keep the draft with mode_active=false so last_error is available for debugging
    await failDraft(agentId, error.message);

    await sendQueued(agentId, 
      cleanNumber,
      `❌ Lo siento, ocurrió un error al crear la propiedad.\n\nPor favor intenta de nuevo escribiendo *"quiero crear una propiedad"*.`
    );
  }
}

// ─── Intent / command detection helpers ──────────────────────────────────────

// Matches common affirmative replies after the summary confirmation step
export function esConfirmacionSi(text: string): boolean {
  return /^(s[ií]|sí|si|dale|correcto|exacto|ok|okay|va|confirmo|confirmar|así es|todo bien|todo correcto)\.?!?$/i.test(text.trim());
}

// Matches the LISTO command that triggers field extraction
export function esComandoListo(text: string): boolean {
  return /^listo\.?!?$/i.test(text.trim());
}

// Matches cancellation intent so the agent can exit the mode at any time
export function esIntentCancelar(text: string): boolean {
  return /no quiero|cancelar|cancela|salir|olvida|olvidalo|olv[ií]dalo|dejalo|d[eé]jalo|para|abort/i.test(text.trim());
}

// Matches property creation intent from the normal conversation mode
export function esIntentCrearPropiedad(text: string): boolean {
  return /crear\s+(una\s+)?propiedad|nueva\s+propiedad|agregar\s+(una\s+)?propiedad|subir\s+(una\s+)?propiedad|añadir\s+(una\s+)?propiedad/i.test(text);
}