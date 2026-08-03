import OpenAI from 'openai';
import { supabaseAdmin } from '@/lib/supabase';
import { loadDraftHistory } from '../session';
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
  summary_triggered?: boolean;    // true once auto-summary fires at PHOTO_MAX
  custom_fields_data?: Record<string, string | number>; // values for agent's custom fields
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
🖼️ *Fotos* (mínimo ${PHOTO_MIN}, máximo ${PHOTO_MAX} imágenes)

_Puedes enviar cada dato por separado o todo junto, en el orden que quieras._
_Para las fotos, envíalas en grupos de máximo 5 a la vez para que se procesen correctamente._
_Si en algún momento no sabes qué datos faltan, escríbeme *"¿qué me falta?"* y te lo digo._
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

      // Upload first — rejected photos are cleaned up by the daily orphan cleanup job
      const tempSlug = `draft-${agentId.substring(0, 8)}`;
      const tempIndex = Date.now();
      const supabaseUrl = await uploadPhotoFromUrl(agentId, tempSlug, publicUrl, tempIndex);

      // v3 RPC: atomic append + dedup + limit enforcement + one-time sentinel
      const { data: rpcResult, error: appendError } = await supabaseAdmin.rpc('draft_append_photo', {
        p_agent_id: agentId,
        p_photo_url: supabaseUrl,
        p_media_id: messageId,
        p_photo_max: PHOTO_MAX,
      });

      if (appendError) {
        console.error('Error in draft_append_photo RPC:', appendError);
        return '❌ Tuve un problema guardando esa foto. Intenta enviarla de nuevo.';
      }

      const { appended, photo_count, trigger_summary } = rpcResult as {
        appended: boolean;
        photo_count: number;
        trigger_summary: boolean;
      };

      console.log(`[media] photo append: appended=${appended} count=${photo_count} trigger=${trigger_summary}`);

      if (trigger_summary) {
        // Only one webhook reaches here — the one that pushed count to PHOTO_MAX
        return '__PHOTO_MAX_REACHED__';
      }

      // No per-photo response — report total at LISTO to avoid 429 on gallery uploads
      return null;
    } catch (error) {
      console.error('Error processing image in draft:', error);
      return '❌ Tuve un problema procesando esa foto. Intenta enviarla de nuevo.';
    }
  }

  if (mediaInfo.type === 'audio') {
    try {
      const { publicUrl } = await decryptWasenderMedia(messageId, mediaInfo.messageObject);
      const transcripcion = await transcribeAudioFromUrl(publicUrl);

      // Save raw transcription as 'user' so the extractor treats it as agent input.
      // route.ts saves the display string (with 🎙️ prefix) as 'assistant' separately.
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
  draftCreatedAt: string
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

  await sendQueued(agentId, cleanNumber,
    `⏳ Analizando la información que me enviaste... _(${photoCount} foto${photoCount !== 1 ? 's' : ''} recibida${photoCount !== 1 ? 's' : ''})_ — Espera un momento, ya casi 📋`
  );

  // Load ALL messages since the draft was created — no limit, no time window.
  const history = await loadDraftHistory(agentId, draftCreatedAt);

  // Seed the extractor with data already confirmed in previous LISTO rounds.
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
  "currency_id": "839f44d5-bee2-4bc1-b5da-50364f14c681 para USD o ec8528a3-d504-47fa-50364f14c681 para CRC, o null",
  "city": "string o null",
  "address": "string o null",
  "state_province": "string o null (provincia de Costa Rica)",
  "property_type": "house | apartment | land | commercial | other",
  "listing_type": "sale | rent",
  "language": "es | en",
  "maps_url": "string o null (link de Google Maps compartido por el agente)",
  "campos_faltantes": ["lista de campos obligatorios que aún faltan"]
}

Campos obligatorios: title, description, price, currency_id, city, property_type, listing_type, maps_url.
El idioma (language) se infiere automáticamente del texto de la descripción — NUNCA lo incluyas en campos_faltantes.
Si la descripción está en español, usa "es". Si está en inglés, usa "en".
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
    const lista = camposFaltantes.map((c: string) => `• ${c}`).join('\n');
    await sendQueued(agentId,
      cleanNumber,
      `⚠️ Faltan algunos datos para poder crear la propiedad:\n\n${lista}\n\nEnvíalos y escribe *LISTO* de nuevo cuando estés listo.\n_Si tienes dudas sobre qué falta, escríbeme *"¿qué me falta?"*_`
    );
    return;
  }

  // ── Custom fields: extract values from history ───────────────────────────────
  // Run a second LLM pass to extract values for this agent's custom fields.
  // Only runs if property_type and listing_type were successfully extracted.
  let customFieldsForExtraction: Array<{field_key: string, field_name: string, field_type: string}> = [];
  if (extractedData?.property_type && extractedData?.listing_type) {
    const { data: cfForExtraction } = await supabaseAdmin
      .from('custom_fields')
      .select('field_key, field_name, field_type')
      .eq('agent_id', agentId)
      .eq('property_type', extractedData.property_type)
      .eq('listing_type', extractedData.listing_type)
      .order('display_order', { ascending: true });
    customFieldsForExtraction = cfForExtraction || [];
  }

  if (customFieldsForExtraction.length > 0) {
    const cfPrompt = `Eres un extractor de valores para campos personalizados de propiedades inmobiliarias.
Analiza el historial y extrae los valores para estos campos específicos.
Devuelve ÚNICAMENTE un JSON válido sin texto adicional ni backticks.
Si un valor no se menciona en el historial, usa null.

Campos a extraer:
${JSON.stringify(customFieldsForExtraction.map(cf => ({ key: cf.field_key, name: cf.field_name, type: cf.field_type })), null, 2)}`;

    try {
      const cfCompletion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: cfPrompt },
          ...history.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
          { role: 'user', content: 'Extrae los valores de los campos personalizados del historial.' },
        ],
        temperature: 0,
      });
      const cfRaw = cfCompletion.choices[0].message.content || '{}';
      const cfValues = JSON.parse(cfRaw.replace(/```json|```/g, '').trim());
      // Merge into draftCustomFields — only overwrite if a new non-null value was found
      Object.entries(cfValues).forEach(([key, val]) => {
        if (val !== null && val !== undefined) {
          draftCustomFields[key] = val as string | number;
        }
      });
    } catch (err) {
      console.error('Error extracting custom field values:', err);
      // Non-fatal — continue without custom field values
    }
  }

  // ── Custom fields check ──────────────────────────────────────────────────────
  // Query agent's custom fields for this property_type + listing_type combination.
  // If any exist and weren't mentioned by the agent, ask for them before showing summary.
  const { data: customFields } = await supabaseAdmin
    .from('custom_fields')
    .select('field_key, field_name, field_type, placeholder, icon')
    .eq('agent_id', agentId)
    .eq('property_type', extractedData.property_type)
    .eq('listing_type', extractedData.listing_type)
    .order('display_order', { ascending: true });

  // Get custom field values already stored in draft (from previous rounds)
  const draftCustomFields: Record<string, string | number> = draft.custom_fields_data || {};

  if (customFields && customFields.length > 0) {
    // Check which custom fields are still missing values
    const customFaltantes = customFields.filter(
      cf => !draftCustomFields[cf.field_key] && draftCustomFields[cf.field_key] !== 0
    );

    if (customFaltantes.length > 0) {
      // Ask for missing custom fields without closing the mode
      const lista = customFaltantes
        .map(cf => `${cf.icon || '🏷️'} *${cf.field_name}*${cf.placeholder ? ` _(ej: ${cf.placeholder})_` : ''}`)
        .join('\n');

      await sendQueued(agentId,
        cleanNumber,
        `📋 Esta propiedad tiene campos adicionales que necesito completar:

${lista}

Envíalos y escribe *LISTO* de nuevo cuando estés listo.`
      );
      return;
    }
  }

  // ── Persist extracted fields to draft so they survive subsequent LISTO rounds ──
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
    language: extractedData.language || 'es',
    maps_url: extractedData.maps_url,
    custom_fields_data: draftCustomFields,
  });

  // Build confirmation summary
  const divisa = extractedData.currency_id === '839f44d5-bee2-4bc1-b5da-50364f14c681' ? 'USD' : 'CRC';
  const tipoMap: Record<string, string> = {
    house: 'Casa', apartment: 'Apartamento', land: 'Terreno/Finca',
    commercial: 'Local Comercial', other: 'Otro',
  };
  const negocioMap: Record<string, string> = { sale: 'Venta', rent: 'Alquiler' };

  // Build custom fields section for summary display
  let customFieldsResumen = '';
  if (customFields && customFields.length > 0) {
    const lineas = customFields
      .map(cf => {
        const valor = draftCustomFields[cf.field_key];
        return `${cf.icon || '🏷️'} *${cf.field_name}:* ${valor ?? 'No indicado'}`;
      })
      .join('\n');
    customFieldsResumen = '\n' + lineas;
  }

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

  await sendQueued(agentId, cleanNumber, `⏳ Perfecto ${primerNombre}, creando tu propiedad... Dame un momento.`);

  // Close the mode before creating so the agent can use the bot normally
  await clearDraft(agentId);

  // Synchronous creation in the same webhook — no setImmediate (unreliable in Vercel serverless)
  await crearPropiedad(agentId, cleanNumber, draft);
}

// ─── Property creation (synchronous) ─────────────────────────────────────────

async function crearPropiedad(
  agentId: string,
  cleanNumber: string,
  draft: PropertyDraft
) {
  try {
    const baseSlug = (draft.title || 'propiedad')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const slug = `${baseSlug}-${Date.now().toString(36)}`;

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
        status: 'active',
        slug,
        show_map: !!draft.maps_url,
        custom_fields_data: draft.custom_fields_data || {},
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
    console.error('Error creating property:', error);
    await failDraft(agentId, error.message);
    await sendQueued(agentId,
      cleanNumber,
      `❌ Lo siento, ocurrió un error al crear la propiedad.\n\nPor favor intenta de nuevo escribiendo *"quiero crear una propiedad"*.`
    );
  }
}

// ─── Intent / command detection helpers ──────────────────────────────────────

export function esConfirmacionSi(text: string): boolean {
  return /^(s[ií]|sí|si|dale|correcto|exacto|ok|okay|va|confirmo|confirmar|así es|todo bien|todo correcto)\.?!?$/i.test(text.trim());
}

export function esComandoListo(text: string): boolean {
  return /^listo\.?!?$/i.test(text.trim());
}

export function esIntentCancelar(text: string): boolean {
  return /no quiero|cancelar|cancela|salir|olvida|olvidalo|olv[ií]dalo|dejalo|d[eé]jalo|para|abort/i.test(text.trim());
}

export function esIntentCrearPropiedad(text: string): boolean {
  return /crear\s+(una\s+)?propiedad|nueva\s+propiedad|agregar\s+(una\s+)?propiedad|subir\s+(una\s+)?propiedad|añadir\s+(una\s+)?propiedad/i.test(text);
}

// Detects when agent asks what data is still missing
export function esConsultaQueFalta(text: string): boolean {
  return /qu[eé]\s+(me\s+)?falta|qu[eé]\s+datos\s+faltan|qu[eé]\s+falta\s+por|qu[eé]\s+me\s+hace\s+falta|falta\s+algo|qu[eé]\s+necesitas/i.test(text.trim());
}

// Responds to "¿qué me falta?" using current draft state — no LISTO extraction needed
export async function handleQueFalta(
  agentId: string,
  cleanNumber: string,
  draft: PropertyDraft | null,
  draftCreatedAt: string
): Promise<string> {
  const faltantes: string[] = [];

  if (!draft?.title)         faltantes.push('📌 Título de la propiedad');
  if (!draft?.description)   faltantes.push('📝 Descripción');
  if (!draft?.price)         faltantes.push('💰 Precio');
  if (!draft?.currency_id)   faltantes.push('💱 Divisa (USD o CRC)');
  if (!draft?.city)          faltantes.push('🌆 Ciudad');
  if (!draft?.property_type) faltantes.push('🏷️ Tipo de propiedad');
  if (!draft?.listing_type)  faltantes.push('📋 Tipo de negocio (Venta o Alquiler)');
  // language is inferred from description — never shown as missing
  if (!draft?.maps_url)      faltantes.push('📍 Link de Google Maps');

  const photoCount = draft?.photos?.length || 0;
  if (photoCount < PHOTO_MIN) faltantes.push(`🖼️ Fotos (tienes ${photoCount}, necesito al menos ${PHOTO_MIN})`);

  if (faltantes.length === 0) {
    return `✅ Ya tienes todo lo necesario. Escribe *LISTO* cuando quieras que revise la información.`;
  }

  const lista = faltantes.join('\n');
  return `📋 Aún me faltan estos datos:\n\n${lista}\n\nEnvíalos cuando quieras y escribe *LISTO* al terminar.`;
}