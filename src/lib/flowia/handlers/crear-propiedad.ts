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
  photos: string[];
  pending_photos: number;
  processed_media_ids?: string[];
  summary_triggered?: boolean;
  custom_fields_data?: Record<string, string | number>;
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

export async function clearDraft(agentId: string) {
  await supabaseAdmin
    .from('agent_property_draft')
    .delete()
    .eq('agent_id', agentId);
}

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
_Si en algún momento no sabes qué datos faltan, escríbeme *"¿qué me falta?"* o simplemente *"0"* y te lo digo._
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
      const tempSlug = `draft-${agentId.substring(0, 8)}`;
      const tempIndex = Date.now();
      const supabaseUrl = await uploadPhotoFromUrl(agentId, tempSlug, publicUrl, tempIndex);

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
        return '__PHOTO_MAX_REACHED__';
      }

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

  const history = await loadDraftHistory(agentId, draftCreatedAt);

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

  const extractionPrompt = 'Eres un extractor de datos para fichas de propiedades inmobiliarias.\n'
    + 'Analiza el historial de conversación y extrae los campos de la propiedad.\n'
    + 'Devuelve ÚNICAMENTE un JSON válido sin texto adicional ni backticks.\n\n'
    + 'IMPORTANTE: Ya tienes estos datos confirmados de rondas anteriores. Úsalos como base y solo sobreescribe si el agente envió información más reciente o corregida:\n'
    + JSON.stringify(draftActual, null, 2) + '\n\n'
    + 'Campos a extraer (combinando lo anterior con lo nuevo del historial):\n'
    + '{\n'
    + '  "title": "string o null",\n'
    + '  "description": "string o null",\n'
    + '  "price": "number o null",\n'
    + '  "currency_id": "839f44d5-bee2-4bc1-b5da-50364f14c681 para USD o ec8528a3-d504-47fa-97db-2c07716d8b47 para CRC, o null",\n'
    + '  "city": "string o null",\n'
    + '  "address": "string o null",\n'
    + '  "state_province": "string o null (provincia de Costa Rica)",\n'
    + '  "property_type": "house | apartment | land | commercial | other",\n'
    + '  "listing_type": "sale | rent",\n'
    + '  "language": "es | en",\n'
    + '  "maps_url": "string o null (link de Google Maps compartido por el agente)",\n'
    + '  "campos_faltantes": ["lista de campos obligatorios que aún faltan"]\n'
    + '}\n\n'
    + 'Campos obligatorios: title, description, price, currency_id, city, property_type, listing_type, maps_url.\n'
    + 'El idioma (language) se infiere automáticamente del texto de la descripción — NUNCA lo incluyas en campos_faltantes.\n'
    + 'Si la descripción está en español, usa "es". Si está en inglés, usa "en".\n'
    + 'state_province y address son opcionales pero deseables.';

  const historyMessages = history.map(function(m) {
    return { role: m.role as 'user' | 'assistant', content: m.content };
  });

  const messagesForExtraction = [
    { role: 'system' as const, content: extractionPrompt },
    ...historyMessages,
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
    const lista = camposFaltantes.map(function(c: string) { return '• ' + c; }).join('\n');
    await sendQueued(agentId,
      cleanNumber,
      '⚠️ Faltan algunos datos para poder crear la propiedad:\n\n' + lista + '\n\nEnvíalos y escribe *LISTO* de nuevo cuando estés listo.\n_Si tienes dudas sobre qué falta, escríbeme *"¿Qué me falta?"* o *"0"*_'
    );
    return;
  }

  // ── Custom fields: declare draftCustomFields BEFORE using it ──────────────
  // This must come before the extraction pass to avoid "cannot access before init" errors.
  const draftCustomFields: Record<string, string | number> = draft.custom_fields_data || {};

  // ── Custom fields: extract values from history ────────────────────────────
  // Run a second LLM pass to extract values for this agent's custom fields.
  // Only runs if property_type and listing_type were successfully extracted.
  let customFieldsForExtraction: Array<{ field_key: string; field_name: string; field_type: string }> = [];
  if (extractedData.property_type && extractedData.listing_type) {
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
    const cfFieldsList = JSON.stringify(
      customFieldsForExtraction.map(function(cf) {
        return { key: cf.field_key, name: cf.field_name, type: cf.field_type };
      }),
      null,
      2
    );

    const cfPrompt = 'Eres un extractor de valores para campos personalizados de propiedades inmobiliarias.\n'
      + 'Analiza TODO el historial de conversación, incluyendo audios transcritos y texto libre.\n'
      + 'Devuelve ÚNICAMENTE un JSON válido sin texto adicional ni backticks.\n'
      + 'Si un valor no se menciona en el historial, usa null.\n'
      + 'Si el agente corrigió un valor, usa el valor más reciente.\n'
      + 'Los valores pueden venir en cualquier formato: "2 baños", "tiene dos baños", "baños: 2", etc.\n\n'
      + 'Campos a extraer:\n'
      + cfFieldsList;

    const cfHistoryMessages = history.map(function(msg) {
      return { role: msg.role as 'user' | 'assistant', content: msg.content };
    });

    try {
      const cfCompletion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: cfPrompt },
          ...cfHistoryMessages,
          { role: 'user', content: 'Extrae los valores de los campos personalizados del historial.' },
        ],
        temperature: 0,
      });
      const cfRaw = cfCompletion.choices[0].message.content || '{}';
      const cfValues = JSON.parse(cfRaw.replace(/```json|```/g, '').trim());
      Object.entries(cfValues).forEach(function(entry) {
        const key = entry[0];
        const val = entry[1];
        if (val !== null && val !== undefined) {
          draftCustomFields[key] = val as string | number;
        }
      });
    } catch (err) {
      console.error('Error extracting custom field values:', err);
    }
  }

  // ── Custom fields check ───────────────────────────────────────────────────
  // Query all custom fields for this property_type + listing_type combination.
  const { data: customFields } = await supabaseAdmin
    .from('custom_fields')
    .select('field_key, field_name, field_type, placeholder, icon')
    .eq('agent_id', agentId)
    .eq('property_type', extractedData.property_type)
    .eq('listing_type', extractedData.listing_type)
    .order('display_order', { ascending: true });

  if (customFields && customFields.length > 0) {
    const customFaltantes = customFields.filter(function(cf) {
      return !draftCustomFields[cf.field_key] && draftCustomFields[cf.field_key] !== 0;
    });

    if (customFaltantes.length > 0) {
      const lista = customFaltantes.map(function(cf) {
        return (cf.icon || '🏷️') + ' *' + cf.field_name + '*' + (cf.placeholder ? ' _(ej: ' + cf.placeholder + ')_' : '');
      }).join('\n');

      // Reset summary_triggered so agent can write LISTO again after filling custom fields
      await upsertDraft(agentId, { summary_triggered: false } as any);

      await sendQueued(agentId,
        cleanNumber,
        '📋 Esta propiedad tiene campos adicionales que necesito completar:\n\n' + lista + '\n\nEnvíalos y escribe *LISTO* de nuevo cuando estés listo.'
      );
      return;
    }
  }

  // ── Persist extracted fields ──────────────────────────────────────────────
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

  // ── Build confirmation summary ────────────────────────────────────────────
  const divisa = extractedData.currency_id === '839f44d5-bee2-4bc1-b5da-50364f14c681' ? 'USD' : 'CRC';
  const tipoMap: Record<string, string> = {
    house: 'Casa', apartment: 'Apartamento', land: 'Terreno/Finca',
    commercial: 'Local Comercial', other: 'Otro',
  };
  const negocioMap: Record<string, string> = { sale: 'Venta', rent: 'Alquiler' };

  let customFieldsResumen = '';
  if (customFields && customFields.length > 0) {
    const lineas = customFields.map(function(cf) {
      const valor = draftCustomFields[cf.field_key];
      return (cf.icon || '🏷️') + ' *' + cf.field_name + ':* ' + (valor !== undefined && valor !== null ? valor : 'No indicado');
    }).join('\n');
    customFieldsResumen = '\n' + lineas;
  }

  const resumen = '✅ *Resumen de la propiedad a crear:*\n\n'
    + '📌 *Título:* ' + extractedData.title + '\n'
    + '🏷️ *Tipo:* ' + (tipoMap[extractedData.property_type] || extractedData.property_type) + '\n'
    + '📋 *Negocio:* ' + (negocioMap[extractedData.listing_type] || extractedData.listing_type) + '\n'
    + '💰 *Precio:* ' + (extractedData.price?.toLocaleString('es-CR')) + ' ' + divisa + '\n'
    + '📍 *Provincia:* ' + (extractedData.state_province || 'No indicada') + '\n'
    + '🌆 *Ciudad:* ' + extractedData.city + '\n'
    + '🏠 *Dirección:* ' + (extractedData.address || 'No indicada') + '\n'
    + '📍 *Google Maps:* ' + (extractedData.maps_url || 'No indicado') + '\n'
    + '🌐 *Idioma:* ' + (extractedData.language === 'es' ? 'Español' : 'Inglés') + '\n'
    + '🖼️ *Fotos:* ' + photoCount
    + customFieldsResumen + '\n\n'
    + '¿Todo correcto? Responde *SÍ* para crear la propiedad, o corrígeme lo que esté mal.';

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
  await clearDraft(agentId);
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

    const editUrl = `${BASE_DOMAIN}/edit-property/${property.id}`;
    const shareUrl = `${BASE_DOMAIN}/p/${property.slug}`;

    await sendQueued(agentId,
      cleanNumber,
      '✅ ¡Tu propiedad fue creada exitosamente!\n\n*' + draft.title + '*\n\n✏️ *Editar y agregar videos:*\n' + editUrl + '\n\n🔗 *Link para compartir con clientes:*\n' + shareUrl
    );
  } catch (error: any) {
    console.error('Error creating property:', error);
    await failDraft(agentId, error.message);
    await sendQueued(agentId,
      cleanNumber,
      '❌ Lo siento, ocurrió un error al crear la propiedad.\n\nPor favor intenta de nuevo escribiendo *"quiero crear una propiedad"*.'
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
  return /no (quiero|deseo|me interesa)|cancelar|cancela|salir|olvida|olvidalo|olv[ií]dalo|dejalo|d[eé]jalo|para(r)?|abort|ya no|no (sigo|continúo|continuo)/i.test(text.trim());
}

export function esIntentCrearPropiedad(text: string): boolean {
  return /crear\s+(una\s+)?propiedad|nueva\s+propiedad|agregar\s+(una\s+)?propiedad|subir\s+(una\s+)?propiedad|añadir\s+(una\s+)?propiedad/i.test(text);
}

export function esConsultaQueFalta(text: string): boolean {
  if (text.trim() === '0') return true;
  return /qu[eé]\s+(me\s+)?falta|qu[eé]\s+datos\s+faltan|qu[eé]\s+falta\s+por|qu[eé]\s+me\s+hace\s+falta|falta\s+algo|qu[eé]\s+necesitas/i.test(text.trim());
}

export async function handleQueFalta(
  agentId: string,
  cleanNumber: string,
  draft: PropertyDraft | null,
  draftCreatedAt: string
): Promise<string> {
  const photoCount = draft?.photos?.length || 0;
  const history = await loadDraftHistory(agentId, draftCreatedAt);

  const quickPrompt = 'Eres un extractor de datos para fichas de propiedades inmobiliarias.\n'
    + 'Analiza el historial y devuelve ÚNICAMENTE un JSON válido indicando qué campos ya fueron proporcionados.\n'
    + 'Responde con true si el campo fue mencionado, false si no.\n'
    + '{\n'
    + '  "title": boolean,\n'
    + '  "description": boolean,\n'
    + '  "price": boolean,\n'
    + '  "currency": boolean,\n'
    + '  "city": boolean,\n'
    + '  "property_type": boolean,\n'
    + '  "listing_type": boolean,\n'
    + '  "maps_url": boolean\n'
    + '}';

  const historyMsgs = history.map(function(m) {
    return { role: m.role as 'user' | 'assistant', content: m.content };
  });

  let provided: Record<string, boolean> = {};
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: quickPrompt },
        ...historyMsgs,
        { role: 'user', content: '¿Cuáles de estos campos ya fueron proporcionados en la conversación?' },
      ],
      temperature: 0,
    });
    const raw = completion.choices[0].message.content || '{}';
    provided = JSON.parse(raw.replace(/```json|```/g, '').trim());
  } catch {
    provided = {
      title: !!draft?.title,
      description: !!draft?.description,
      price: !!draft?.price,
      currency: !!draft?.currency_id,
      city: !!draft?.city,
      property_type: !!draft?.property_type,
      listing_type: !!draft?.listing_type,
      maps_url: !!draft?.maps_url,
    };
  }

  const faltantes: string[] = [];
  if (!provided.title)         faltantes.push('📌 Título de la propiedad');
  if (!provided.description)   faltantes.push('📝 Descripción');
  if (!provided.price)         faltantes.push('💰 Precio');
  if (!provided.currency)      faltantes.push('💱 Divisa (USD o CRC)');
  if (!provided.city)          faltantes.push('🌆 Ciudad');
  if (!provided.property_type) faltantes.push('🏷️ Tipo de propiedad');
  if (!provided.listing_type)  faltantes.push('📋 Tipo de negocio (Venta o Alquiler)');
  if (!provided.maps_url)      faltantes.push('📍 Link de Google Maps');
  if (photoCount < PHOTO_MIN)  faltantes.push('🖼️ Fotos (tienes ' + photoCount + ', necesito al menos ' + PHOTO_MIN + ')');

  // Check custom fields if property_type is known in the draft
  if (draft?.property_type && draft?.listing_type) {
    const { data: cfCheck } = await supabaseAdmin
      .from('custom_fields')
      .select('field_key, field_name, icon')
      .eq('agent_id', agentId)
      .eq('property_type', draft.property_type)
      .eq('listing_type', draft.listing_type)
      .order('display_order', { ascending: true });

    if (cfCheck && cfCheck.length > 0) {
      const existingCf = draft.custom_fields_data || {};
      cfCheck.forEach(function(cf) {
        if (!existingCf[cf.field_key] && existingCf[cf.field_key] !== 0) {
          faltantes.push((cf.icon || '🏷️') + ' ' + cf.field_name + ' _(campo personalizado)_');
        }
      });
    }
  }

  if (faltantes.length === 0) {
    return '✅ Ya tienes todo lo necesario. Escribe *LISTO* cuando quieras que revise la información.';
  }

  return '📋 Aún me faltan estos datos:\n\n' + faltantes.join('\n') + '\n\nEnvíalos cuando quieras y escribe *LISTO* al terminar.';
}