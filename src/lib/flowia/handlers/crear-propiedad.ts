import OpenAI from 'openai';
import { supabaseAdmin } from '@/lib/supabase';
import { loadDraftHistory, saveMessage } from '../session';
import { sendQueued } from '@/lib/api/wasender';
import { decryptWasenderMedia, extractMediaInfo } from '../media/decrypt';
import { uploadPhotoFromUrl } from '../media/upload-photo';
import { transcribeAudioFromUrl } from '../media/transcribe-audio';
import { BASE_DOMAIN, PHOTO_MIN, PHOTO_MAX } from '../constants';
import { extractCoordinatesFromMapsUrl, geocodeByCity } from '../media/extract-coordinates';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface AgentWatermarkConfig {
  watermark_logo?: string | null;
  watermark_position?: string | null;
  watermark_size?: string | null;
  watermark_image?: string | null;
  watermark_opacity?: number | null;
  watermark_scale?: number | null;
  use_corner_logo?: boolean | null;
  use_watermark?: boolean | null;
}

// Lean draft — only what the DB actually stores now.
// Text fields were removed from the table because they were unreliable due to
// the race condition between handleListo() upsert and the Sí confirmation webhook.
// The confirmed summary text is the single source of truth for all property data.
export interface PropertyDraft {
  photos: string[];
  pending_photos: number;
  processed_media_ids?: string[];
  last_error?: string | null;
  mode_active?: boolean;
  created_at?: string;
}

// Full property data reconstructed from the summary — passed around in memory only,
// never persisted to agent_property_draft.
export interface PropertyData {
  title: string;
  description?: string;
  price: number;
  currency_id: string;
  city: string;
  address?: string;
  state_province?: string;
  property_type: string;
  listing_type: string;
  language: string;
  maps_url?: string;
  photos: string[];
  custom_fields_data: Record<string, string | number>;
}

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
    .eq('mode_active', true)
    .maybeSingle();

  if (existing) {
    await supabaseAdmin
      .from('agent_property_draft')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('agent_id', agentId)
      .eq('mode_active', true);
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

  const mensaje = '¡Perfecto ' + primerNombre + '! 🏠 Vamos a crear una nueva propiedad.\n\n'
    + 'Puedes enviarme la información en el orden que prefieras — *por escrito o por audio* 🎤. Estos son los campos que necesito:\n\n'
    + '📌 *Título* de la propiedad\n'
    + '💰 *Precio* y *divisa* (colones o dólares)\n'
    + '🏷️ *Tipo* (Casa, Apartamento, Finca, Local Comercial, etc.)\n'
    + '📋 *Tipo de negocio* (Venta o Alquiler)\n'
    + '🌍 *Provincia*, *ciudad* y *dirección*\n'
    + '📍 *Link de Google Maps* de la ubicación\n'
    + '📝 *Descripción* de la propiedad\n'
    + '🖼️ *Fotos* (mínimo ' + PHOTO_MIN + ', máximo ' + PHOTO_MAX + ' imágenes)\n\n'
    + '_Puedes enviar cada dato por separado o todo junto, en el orden que quieras._\n'
    + '_Para las fotos, envíalas en grupos de máximo 5 a la vez para que se procesen correctamente._\n'
    + '_Si en algún momento no sabes qué datos faltan, escríbeme *"¿Qué me falta?"* o simplemente *"0"* y te lo digo._\n'
    + 'Cuando termines, escribe *LISTO* y yo verificaré todo antes de crear la propiedad.';

  await sendQueued(agentId, cleanNumber, mensaje);
}

export async function handleMediaEnDraft(
  agentId: string,
  cleanNumber: string,
  messageId: string,
  message: Record<string, any>,
  watermarkConfig?: AgentWatermarkConfig
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
        console.log('⏭️ Media ' + messageId + ' already processed, skipping.');
        return null;
      }

      // Early exit: discard excess photos before any costly operations
      const currentPhotoCount = draftRaw?.photos?.length || 0;
      if (currentPhotoCount >= PHOTO_MAX) {
        console.log('[media] photo limit reached (' + currentPhotoCount + '), discarding webhook silently.');
        return null;
      }

      const { publicUrl } = await decryptWasenderMedia(messageId, mediaInfo.messageObject);
      const tempSlug = 'draft-' + agentId.substring(0, 8);
      const tempIndex = Date.now();
      const supabaseUrl = await uploadPhotoFromUrl(agentId, tempSlug, publicUrl, tempIndex, watermarkConfig);

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

      console.log('[media] photo append: appended=' + appended + ' count=' + photo_count + ' trigger=' + trigger_summary);

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

      return '🎙️ _Audio transcrito:_ ' + transcripcion;
    } catch (error) {
      console.error('Error transcribing audio in draft:', error);
      return '❌ No pude transcribir ese audio. Intenta enviarlo de nuevo o escribe el mensaje.';
    }
  }

  if (mediaInfo.type === 'video') {
    return '⚠️ No puedo procesar videos aquí. Solo acepto fotos (JPEG o PNG). Agrega los videos desde la aplicación después de crear la propiedad.';
  }

  return null;
}

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
      '⚠️ Aún necesito al menos *' + PHOTO_MIN + ' fotos* para crear la propiedad. Actualmente tienes *' + photoCount + '*. Envíalas y escribe LISTO de nuevo.'
    );
    return;
  }

  await sendQueued(agentId, cleanNumber,
    '⏳ Analizando la información que me enviaste... _(' + photoCount + ' foto' + (photoCount !== 1 ? 's' : '') + ' recibida' + (photoCount !== 1 ? 's' : '') + ')_ — Espera un momento, ya casi 📋'
  );

  const history = await loadDraftHistory(agentId, draftCreatedAt);

  const extractionPrompt = 'Eres un extractor de datos para fichas de propiedades inmobiliarias en Costa Rica.\n'
    + 'Analiza el historial de conversación y extrae los campos de la propiedad.\n'
    + 'Devuelve ÚNICAMENTE un JSON válido sin texto adicional ni backticks.\n\n'
    + 'Campos a extraer:\n'
    + '{\n'
    + '  "title": "string o null",\n'
    + '  "price": "number o null (extrae el número, ej: 78000000 si dice 78 millones)",\n'
    + '  "currency_id": "REGLA: si menciona colones/CRC/₡ → ec8528a3-d504-47fa-97db-2c07716d8b47. Si menciona dólares/USD/$ → 839f44d5-bee2-4bc1-b5da-50364f14c681. null si no se menciona divisa.",\n'
    + '  "city": "string o null",\n'
    + '  "address": "string o null",\n'
    + '  "state_province": "string o null (provincia de Costa Rica)",\n'
    + '  "property_type": "house | condo | apartment | land | finca | quinta | commercial | hotel | other",\n'
    + '  "listing_type": "sale si dice venta/vender | rent si dice alquiler/arrendar",\n'
    + '  "language": "es | en",\n'
    + '  "maps_url": "string o null (link de Google Maps compartido por el agente)",\n'
    + '  "campos_faltantes": ["lista de campos obligatorios que aún faltan"]\n'
    + '}\n\n'
    + 'Campos obligatorios: title, price, currency_id, city, property_type, listing_type, maps_url.\n'
    + 'El idioma (language) se infiere automáticamente del texto — NUNCA lo incluyas en campos_faltantes.\n'
    + 'state_province y address son opcionales pero deseables.\n\n'
    + 'Tipos de propiedad disponibles (usa el valor exacto): house=Casa, condo=Condominio, apartment=Apartamento, land=Terreno/Lote, finca=Finca, quinta=Quinta, commercial=Comercial/Negocio/Local, hotel=Hotel, other=Otros.\n'
    + 'Tipos de negocio: sale si dice venta/vender/compra. rent si dice alquiler/arrendar/rentar/alquilar.';

  const historyMessages = history.map(function(m) {
    return { role: m.role as 'user' | 'assistant', content: m.content };
  });

  const messagesForExtraction = [
    { role: 'system' as const, content: extractionPrompt },
    ...historyMessages,
    { role: 'user' as const, content: 'Extrae los datos de la propiedad del historial.' },
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

  // If property_type ended up as 'other' but agent mentioned a specific type,
  // it means the type wasn't recognized — add it to campos_faltantes with the full list
  if (extractedData.property_type === 'other') {
    const historyText = history.map(function(m) { return m.content; }).join(' ').toLowerCase();
    const dijExplicitamenteOtro = /\bother\b|\botros\b|\botro\b/.test(historyText);
    if (!dijExplicitamenteOtro) {
      extractedData.campos_faltantes = extractedData.campos_faltantes || [];
      extractedData.campos_faltantes.push(
        'Tipo de propiedad no reconocido. Indica uno de estos:\n'
        + '   🏠 Casa\n'
        + '   🏢 Condominio\n'
        + '   🏙️ Apartamento\n'
        + '   🌿 Terreno\n'
        + '   🌳 Finca\n'
        + '   🏡 Quinta\n'
        + '   🏬 Comercial\n'
        + '   🏨 Hotel\n'
        + '   📦 Otros'
      );
      extractedData.property_type = null;
    }
  }

  const camposLabels: Record<string, string> = {
    title: 'Título de la propiedad',
    price: 'Precio',
    currency_id: 'Divisa (colones o dólares)',
    city: 'Ciudad',
    address: 'Dirección',
    state_province: 'Provincia',
    property_type: 'Tipo de propiedad',
    listing_type: 'Tipo de negocio (Venta o Alquiler)',
    maps_url: 'Link de Google Maps de la ubicación',
    language: 'Idioma',
  };

  const camposFaltantes: string[] = extractedData.campos_faltantes || [];
  if (camposFaltantes.length > 0) {
    const lista = camposFaltantes.map(function(c: string) {
      return '• ' + (camposLabels[c] || c);
    }).join('\n');
    await sendQueued(agentId,
      cleanNumber,
      '⚠️ Faltan algunos datos para poder crear la propiedad:\n\n' + lista + '\n\nEnvíalos y escribe *LISTO* de nuevo cuando estés listo.\n_Si tienes dudas sobre qué falta, escríbeme *"¿Qué me falta?"* o *"0"*_'
    );
    return;
  }

  // ── Extract custom field values from conversation history ─────────────────
  const customFieldValues: Record<string, string | number> = {};

  let customFieldDefs: Array<{ field_key: string; field_name: string; field_type: string; icon?: string; placeholder?: string }> = [];
  if (extractedData.property_type && extractedData.listing_type) {
    const { data: cfDefs } = await supabaseAdmin
      .from('custom_fields')
      .select('field_key, field_name, field_type, icon, placeholder')
      .eq('agent_id', agentId)
      .eq('property_type', extractedData.property_type)
      .eq('listing_type', extractedData.listing_type)
      .order('display_order', { ascending: true });
    customFieldDefs = cfDefs || [];
  }

  if (customFieldDefs.length > 0) {
    const cfFieldsList = JSON.stringify(
      customFieldDefs.map(function(cf) {
        return { key: cf.field_key, name: cf.field_name, type: cf.field_type };
      }),
      null,
      2
    );

    const cfPrompt = 'Eres un extractor de valores para campos personalizados de propiedades inmobiliarias.\n'
      + 'Analiza TODO el historial de conversación, incluyendo audios transcritos y texto libre.\n'
      + 'Devuelve ÚNICAMENTE un JSON válido sin texto adicional ni backticks.\n'
      + 'Si un valor no se menciona en el historial, usa null.\n'
      + 'Los valores pueden venir en cualquier formato natural: "2 baños", "tiene dos baños", "sí tiene sala", etc.\n\n'
      + 'Campos a extraer:\n'
      + cfFieldsList;

    try {
      const cfCompletion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: cfPrompt },
          ...historyMessages,
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
          customFieldValues[key] = val as string | number;
        }
      });
    } catch (err) {
      console.error('Error extracting custom field values:', err);
    }

    // Check if any required custom fields are still missing
    const missingCustomFields = customFieldDefs.filter(function(cf) {
      return !customFieldValues[cf.field_key] && customFieldValues[cf.field_key] !== 0;
    });

    if (missingCustomFields.length > 0) {
      const lista = missingCustomFields.map(function(cf) {
        return (cf.icon || '🏷️') + ' *' + cf.field_name + '*' + (cf.placeholder ? ' _(ej: ' + cf.placeholder + ')_' : '');
      }).join('\n');

      await sendQueued(agentId,
        cleanNumber,
        '📋 Esta propiedad tiene campos adicionales que necesito completar:\n\n' + lista + '\n\nEnvíalos y escribe *LISTO* de nuevo cuando estés listo.'
      );
      return;
    }
  }

  // ── Build the summary and send it ─────────────────────────────────────────
  const divisa = extractedData.currency_id === '839f44d5-bee2-4bc1-b5da-50364f14c681' ? 'USD' : 'CRC';
  const tipoMap: Record<string, string> = {
    house: 'Casa', condo: 'Condominio', apartment: 'Apartamento', land: 'Terreno',
    finca: 'Finca', quinta: 'Quinta', commercial: 'Comercial', hotel: 'Hotel', other: 'Otros',
  };
  const negocioMap: Record<string, string> = { sale: 'Venta', rent: 'Alquiler' };

  let customFieldsResumen = '';
  if (customFieldDefs.length > 0) {
    const lineas = customFieldDefs.map(function(cf) {
      const valor = customFieldValues[cf.field_key];
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
  await saveMessage(agentId, 'assistant', resumen);
  await upsertDraft(agentId, { pending_photos: photoCount });
}

// Parses the confirmed summary text to extract all property fields.
// This is the single source of truth for property data — the summary is always
// correct because it was shown to the agent and confirmed with Sí.
// Custom fields appear after the base fields in the summary, one per line.
function parseSummaryText(
  summaryText: string,
  draftPhotos: string[],
  customFieldDefs: Array<{ field_key: string; field_name: string; icon?: string }>
): PropertyData {
  // WhatsApp bold wraps labels like: *Título:* value
  // Regex captures the value after the last colon+space on each line
  const getField = (label: string): string | null => {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp('\\*?' + escaped + '\\*?\\s*(.+)', 'i');
    const match = summaryText.match(regex);
    return match ? match[1].replace(/\*/g, '').trim() : null;
  };

  const titleRaw    = getField('Título:');
  const typeRaw     = getField('Tipo:');
  const listingRaw  = getField('Negocio:');
  const priceRaw    = getField('Precio:');
  const provinceRaw = getField('Provincia:');
  const cityRaw     = getField('Ciudad:');
  const addressRaw  = getField('Dirección:');
  const mapsRaw     = getField('Google Maps:');
  const langRaw     = getField('Idioma:');

  // Reverse maps
  const typeReverse: Record<string, string> = {
    'Casa': 'house', 'Condominio': 'condo', 'Apartamento': 'apartment',
    'Terreno': 'land', 'Finca': 'finca', 'Quinta': 'quinta',
    'Comercial': 'commercial', 'Hotel': 'hotel', 'Otros': 'other',
  };
  const listingReverse: Record<string, string> = { 'Venta': 'sale', 'Alquiler': 'rent' };

  // Price: remove thousand separators (dots/spaces), parse number
  let price = 0;
  let currency_id = '839f44d5-bee2-4bc1-b5da-50364f14c681'; // USD default
  if (priceRaw) {
    const normalized = priceRaw.replace(/[\s.]/g, '').replace(',', '.');
    const numMatch = normalized.match(/[\d]+(?:\.\d+)?/);
    if (numMatch) price = parseFloat(numMatch[0]);
    if (/CRC|₡|colones/i.test(priceRaw)) {
      currency_id = 'ec8528a3-d504-47fa-97db-2c07716d8b47';
    }
  }

  // Extract custom field values from the summary lines
  const customFieldValues: Record<string, string | number> = {};
  customFieldDefs.forEach(function(cf) {
    const val = getField(cf.field_name + ':');
    if (val && val !== 'No indicado') {
      customFieldValues[cf.field_key] = val;
    }
  });

  return {
    title: titleRaw || 'Propiedad',
    price,
    currency_id,
    city: cityRaw || '',
    address: (addressRaw && addressRaw !== 'No indicada') ? addressRaw : undefined,
    state_province: (provinceRaw && provinceRaw !== 'No indicada') ? provinceRaw : undefined,
    property_type: typeRaw ? (typeReverse[typeRaw] || 'other') : 'other',
    listing_type: listingRaw ? (listingReverse[listingRaw] || 'sale') : 'sale',
    language: langRaw === 'Inglés' ? 'en' : 'es',
    maps_url: (mapsRaw && mapsRaw !== 'No indicado') ? mapsRaw : undefined,
    photos: draftPhotos,
    custom_fields_data: customFieldValues,
  };
}

// Generates a natural, non-generic property description using GPT based on all
// available property data. Always called before creating the property so the
// not-null constraint on properties.description is always satisfied.
async function generateDescription(data: PropertyData): Promise<string> {
  const typeMap: Record<string, string> = {
    house: 'Casa', condo: 'Condominio', apartment: 'Apartamento', land: 'Terreno',
    finca: 'Finca', quinta: 'Quinta', commercial: 'Local comercial', hotel: 'Hotel', other: 'Propiedad',
  };
  const listingMap: Record<string, string> = { sale: 'en venta', rent: 'en alquiler' };

  const currencyLabel = data.currency_id === '839f44d5-bee2-4bc1-b5da-50364f14c681' ? 'USD' : '₡';
  const priceFormatted = data.price ? data.price.toLocaleString('es-CR') + ' ' + currencyLabel : null;
  const typeLabel = typeMap[data.property_type] || 'Propiedad';
  const listingLabel = listingMap[data.listing_type] || '';

  const contextLines: string[] = [
    'Tipo: ' + typeLabel + ' ' + listingLabel,
    data.city ? 'Ubicación: ' + data.city + (data.state_province ? ', ' + data.state_province : '') : null,
    data.address ? 'Dirección: ' + data.address : null,
    priceFormatted ? 'Precio: ' + priceFormatted : null,
  ].filter(Boolean) as string[];

  if (data.custom_fields_data && Object.keys(data.custom_fields_data).length > 0) {
    Object.entries(data.custom_fields_data).forEach(([key, val]) => {
      if (val !== null && val !== undefined && val !== '') {
        contextLines.push(key + ': ' + val);
      }
    });
  }

  const prompt = 'Eres un redactor especializado en bienes raíces en Costa Rica.\n'
    + 'Escribe una descripción atractiva y natural para esta propiedad. '
    + 'Máximo 3 oraciones. No uses frases genéricas como "no te pierdas esta oportunidad" o "llama ya". '
    + 'Que suene humana, específica y enfocada en los puntos fuertes reales de la propiedad. '
    + 'Responde ÚNICAMENTE con el texto de la descripción, sin comillas ni encabezados.\n\n'
    + 'Datos de la propiedad:\n'
    + contextLines.join('\n');

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 200,
    });
    return completion.choices[0].message.content?.trim() || typeLabel + ' ' + listingLabel + ' en ' + (data.city || 'Costa Rica') + '.';
  } catch (err) {
    console.error('[generateDescription] OpenAI error:', err);
    return typeLabel + ' ' + listingLabel + ' en ' + (data.city || 'Costa Rica') + '.';
  }
}

export async function handleConfirmacion(
  agentId: string,
  cleanNumber: string,
  primerNombre: string,
  lastBotContent: string
) {
  const draft = await getDraft(agentId);

  if (!draft) {
    await sendQueued(agentId, cleanNumber, '❌ No encontré información de la propiedad. Por favor inicia el proceso de nuevo.');
    return;
  }

  // Load custom field definitions so parseSummaryText can extract their values
  // from the summary lines (e.g. "⛰️ *Topografía:* plana")
  let customFieldDefs: Array<{ field_key: string; field_name: string; icon?: string }> = [];
  // We need property_type and listing_type to query custom fields, but those
  // come from the summary itself — so we do a quick parse first just for those two.
  const typeMatch = lastBotContent.match(/🏷️\s*\*?Tipo:\*?\s*(.+)/);
  const listingMatch = lastBotContent.match(/📋\s*\*?Negocio:\*?\s*(.+)/);
  const typeReverse: Record<string, string> = {
    'Casa': 'house', 'Condominio': 'condo', 'Apartamento': 'apartment',
    'Terreno': 'land', 'Finca': 'finca', 'Quinta': 'quinta',
    'Comercial': 'commercial', 'Hotel': 'hotel', 'Otros': 'other',
  };
  const listingReverse: Record<string, string> = { 'Venta': 'sale', 'Alquiler': 'rent' };
  const propertyType = typeMatch ? (typeReverse[typeMatch[1].replace(/\*/g, '').trim()] || 'other') : null;
  const listingType = listingMatch ? (listingReverse[listingMatch[1].replace(/\*/g, '').trim()] || 'sale') : null;

  if (propertyType && listingType) {
    const { data: cfDefs } = await supabaseAdmin
      .from('custom_fields')
      .select('field_key, field_name, icon')
      .eq('agent_id', agentId)
      .eq('property_type', propertyType)
      .eq('listing_type', listingType)
      .order('display_order', { ascending: true });
    customFieldDefs = cfDefs || [];
  }

  // Parse all property data from the confirmed summary text.
  // The summary is the single source of truth — it was shown to the agent
  // and confirmed with Sí, so it always contains the correct final data.
  const propertyData = parseSummaryText(lastBotContent, draft.photos || [], customFieldDefs);

  if (!propertyData.title || !propertyData.price || !propertyData.city) {
    console.error('[handleConfirmacion] Could not parse critical fields from summary:', {
      title: propertyData.title,
      price: propertyData.price,
      city: propertyData.city,
    });
    await sendQueued(agentId, cleanNumber,
      '⚠️ No pude leer los datos del resumen correctamente. Escribe *LISTO* para que vuelva a analizar la información.'
    );
    return;
  }

  // Generate AI description — always, since description is never in the summary
  propertyData.description = await generateDescription(propertyData);

  await sendQueued(agentId, cleanNumber, '⏳ Perfecto ' + primerNombre + ', creando tu propiedad... Dame un momento.');
  await clearDraft(agentId);
  await createProperty(agentId, cleanNumber, propertyData);
}

async function createProperty(
  agentId: string,
  cleanNumber: string,
  data: PropertyData
) {
  try {
    const baseSlug = (data.title || 'propiedad')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const slug = baseSlug + '-' + Date.now().toString(36);

    // Extract coordinates from Google Maps link or fallback to geocoding by city
    let latitude: string | null = null;
    let longitude: string | null = null;

    if (data.maps_url) {
      const coords = await extractCoordinatesFromMapsUrl(data.maps_url);
      if (coords) {
        latitude = coords.lat;
        longitude = coords.lng;
      }
    }

    if (!latitude || !longitude) {
      const coords = await geocodeByCity(data.city || '', data.state_province);
      if (coords) {
        latitude = coords.lat;
        longitude = coords.lng;
      }
    }

    const { data: property, error: propertyError } = await supabaseAdmin
      .from('properties')
      .insert({
        agent_id: agentId,
        title: data.title,
        description: data.description,
        price: data.price,
        currency_id: data.currency_id,
        city: data.city,
        address: data.address,
        state: data.state_province,
        property_type: data.property_type || 'house',
        listing_type: data.listing_type || 'sale',
        language: data.language || 'es',
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        plus_code: null,
        photos: data.photos,
        status: 'active',
        slug,
        show_map: !!(latitude && longitude),
        custom_fields_data: data.custom_fields_data || {},
      })
      .select('id, slug')
      .single();

    if (propertyError || !property) {
      throw new Error(propertyError?.message || 'Unknown error inserting property');
    }

    // ── Move photos from draft-* folder to {slug}/ folder ──────────────────
    const movedPhotoUrls: string[] = [];
    const storageBase = process.env.NEXT_PUBLIC_SUPABASE_URL + '/storage/v1/object/public/property-photos/';

    for (let i = 0; i < data.photos.length; i++) {
      const originalUrl = data.photos[i];
      try {
        const originalPath = originalUrl.replace(storageBase, '');
        const fileName = originalPath.split('/').pop() || 'foto-' + i + '.jpg';
        const newPath = agentId + '/' + property.slug + '/' + fileName;

        const { data: fileData, error: downloadError } = await supabaseAdmin.storage
          .from('property-photos')
          .download(originalPath);

        if (downloadError || !fileData) {
          console.error('[move-photos] Download failed for ' + originalPath + ':', downloadError);
          continue;
        }

        const fileBuffer = Buffer.from(await fileData.arrayBuffer());
        const { error: uploadError } = await supabaseAdmin.storage
          .from('property-photos')
          .upload(newPath, fileBuffer, {
            contentType: 'image/jpeg',
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          console.error('[move-photos] Upload failed for ' + newPath + ':', uploadError);
          continue;
        }

        const { data: newUrlData } = supabaseAdmin.storage
          .from('property-photos')
          .getPublicUrl(newPath);

        movedPhotoUrls.push(newUrlData.publicUrl);

        await supabaseAdmin.storage
          .from('property-photos')
          .remove([originalPath]);

      } catch (err) {
        console.error('[move-photos] Unexpected error for photo ' + i + ':', err);
      }
    }

    if (movedPhotoUrls.length > 0) {
      await supabaseAdmin
        .from('properties')
        .update({ photos: movedPhotoUrls })
        .eq('id', property.id);
    }

    // Save to agent_last_property_shown so normal mode can offer PDF immediately
    await supabaseAdmin
      .from('agent_last_property_shown')
      .upsert({ agent_id: agentId, slug: property.slug }, { onConflict: 'agent_id' });

    const editUrl = BASE_DOMAIN + '/edit-property/' + property.id;
    const shareUrl = BASE_DOMAIN + '/p/' + property.slug;

    const successMessage = '✅ ¡Tu propiedad fue creada exitosamente!\n\n'
      + '*' + data.title + '*\n\n'
      + '✏️ *Editar y agregar videos:*\n' + editUrl + '\n\n'
      + '🔗 *Link para compartir con clientes:*\n' + shareUrl + '\n\n'
      + '---\n'
      + '¿Qué deseas hacer ahora?\n\n'
      + '🔍 *1.* Buscar propiedades\n'
      + '📄 *2.* Enviar PDF de una propiedad\n'
      + '🪪 *3.* Mi tarjeta digital\n'
      + '⛰️ *4.* Altura de un lugar\n'
      + '🏠 *5.* Crear otra propiedad';

    await sendQueued(agentId, cleanNumber, successMessage);
  } catch (error: any) {
    console.error('Error creating property:', error);
    await failDraft(agentId, error.message);
    await sendQueued(agentId,
      cleanNumber,
      '❌ Lo siento, ocurrió un error al crear la propiedad.\n\nPor favor intenta de nuevo escribiendo *"quiero crear una propiedad"*.'
    );
  }
}

export function esConfirmacionSi(text: string): boolean {
  return /^(s[ií]|sí|si|dale|correcto|exacto|ok|okay|va|confirmo|confirmar|así es|todo bien|todo correcto)\.?!?$/i.test(text.trim());
}

export function esComandoListo(text: string): boolean {
  return /^listo\.?!?$/i.test(text.trim());
}

export function esIntentCancelar(text: string): boolean {
  return /no (quiero|deseo|me interesa)|cancelar|cancela|salir|olvida|olvidalo|olv[ií]dalo|dejalo|d[eé]jalo|^para(r)?$|abort|ya no|no (sigo|continúo|continuo)/i.test(text.trim());
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

  const quickPrompt = 'Eres un extractor de datos para fichas de propiedades inmobiliarias en Costa Rica.\n'
    + 'Analiza el historial y devuelve ÚNICAMENTE un JSON válido indicando qué campos ya fueron proporcionados.\n'
    + 'Responde con true si el campo fue mencionado, false si no.\n'
    + 'NOTA: currency es true si el agente mencionó colones, dólares, o cualquier divisa.\n'
    + '{\n'
    + '  "title": boolean,\n'
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
      title: false,
      price: false,
      currency: false,
      city: false,
      property_type: false,
      listing_type: false,
      maps_url: false,
    };
  }

  const faltantes: string[] = [];
  if (!provided.title)         faltantes.push('📌 Título de la propiedad');
  if (!provided.price)         faltantes.push('💰 Precio');
  if (!provided.currency)      faltantes.push('💱 Divisa (colones o dólares)');
  if (!provided.city)          faltantes.push('🌆 Ciudad');
  if (!provided.property_type) faltantes.push('🏷️ Tipo de propiedad');
  if (!provided.listing_type)  faltantes.push('📋 Tipo de negocio (Venta o Alquiler)');
  if (!provided.maps_url)      faltantes.push('📍 Link de Google Maps');
  if (photoCount < PHOTO_MIN)  faltantes.push('🖼️ Fotos (tienes ' + photoCount + ', necesito al menos ' + PHOTO_MIN + ')');

  if (faltantes.length === 0) {
    return '✅ Ya tienes todo lo necesario. Escribe *LISTO* cuando quieras que revise la información.';
  }

  return '📋 Aún me faltan estos datos:\n\n' + faltantes.join('\n') + '\n\nEnvíalos cuando quieras y escribe *LISTO* al terminar.';
}