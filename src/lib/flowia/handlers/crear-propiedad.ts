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

export type FlowLanguage = 'es' | 'en';

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
  flow_language?: FlowLanguage;
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

// ── All user-facing strings in both languages ─────────────────────────────────
const MESSAGES = {
  es: {
    languageQuestion:
      '🌐 ¿En qué idioma vas a crear esta propiedad? / What language will you use for this property?\n\n'
      + '🇨🇷 *1.* Español\n'
      + '🇺🇸 *2.* English',
    welcomeFlow: (name: string) =>
      '¡Perfecto ' + name + '! 🏠 Vamos a crear una nueva propiedad.\n\n'
      + 'Puedes enviarme la información en el orden que prefieras — *por escrito o por audio* 🎤. Estos son los campos que necesito:\n\n'
      + '📌 *Título* de la propiedad\n'
      + '💰 *Precio* y *divisa* (colones o dólares)\n'
      + '🏷️ *Tipo* (Casa, Apartamento, Finca, Local Comercial, etc.)\n'
      + '📋 *Tipo de negocio* (Venta o Alquiler)\n'
      + '🌍 *Provincia*, *ciudad* y *dirección*\n'
      + '📍 *Link de Google Maps* de la ubicación\n'
      + '🖼️ *Fotos* (mínimo ' + PHOTO_MIN + ', máximo ' + PHOTO_MAX + ' imágenes)\n\n'
      + '_Puedes enviar cada dato por separado o todo junto, en el orden que quieras._\n'
      + '_Para las fotos, envíalas en grupos de máximo 5 a la vez para que se procesen correctamente._\n'
      + '_Si en algún momento no sabes qué datos faltan, escríbeme *"¿Qué me falta?"* o simplemente *"0"* y te lo digo._\n'
      + 'Cuando termines, escribe *LISTO* y yo verificaré todo antes de crear la propiedad.',
    ack: '📝 Recibido. Sigue enviando la información de la propiedad. Cuando termines, escribe *LISTO*.\n_Si no sabes qué falta, escríbeme *"¿Qué me falta?"* o simplemente *"0"*_',
    cancelled: (name: string) => 'Entendido ' + name + ', cancelé la creación de la propiedad. ¿En qué más te puedo ayudar?',
    notEnoughPhotos: (min: number, count: number) =>
      '⚠️ Aún necesito al menos *' + min + ' fotos* para crear la propiedad. Actualmente tienes *' + count + '*. Envíalas y escribe LISTO de nuevo.',
    analyzing: (count: number) =>
      '⏳ Analizando la información que me enviaste... _(' + count + ' foto' + (count !== 1 ? 's' : '') + ' recibida' + (count !== 1 ? 's' : '') + ')_ — Espera un momento, ya casi 📋',
    missingFields: (list: string) =>
      '⚠️ Faltan algunos datos para poder crear la propiedad:\n\n' + list + '\n\nEnvíalos y escribe *LISTO* de nuevo cuando estés listo.\n_Si tienes dudas sobre qué falta, escríbeme *"¿Qué me falta?"* o *"0"*_',
    missingCustomFields: (list: string) =>
      '📋 Esta propiedad tiene campos adicionales que necesito completar:\n\n' + list + '\n\nEnvíalos y escribe *LISTO* de nuevo cuando estés listo.',
    summaryHeader: '✅ *Resumen de la propiedad a crear:*',
    summaryConfirmPrompt: '¿Todo correcto? Responde *SÍ* para crear la propiedad, o corrígeme lo que esté mal.',
    confirmationMarker: '¿Todo correcto? Responde *SÍ*',
    creating: (name: string) => '⏳ Perfecto ' + name + ', creando tu propiedad... Dame un momento.',
    successMessage: (title: string, editUrl: string, shareUrl: string) =>
      '✅ ¡Tu propiedad fue creada exitosamente!\n\n'
      + '*' + title + '*\n\n'
      + '✏️ *Editar y agregar videos:*\n' + editUrl + '\n\n'
      + '🔗 *Link para compartir con clientes:*\n' + shareUrl + '\n\n'
      + '---\n'
      + '¿Qué deseas hacer ahora?\n\n'
      + '🔍 *1.* Buscar propiedades\n'
      + '📄 *2.* Enviar PDF de una propiedad\n'
      + '🪪 *3.* Mi tarjeta digital\n'
      + '⛰️ *4.* Altura de un lugar\n'
      + '🏠 *5.* Crear otra propiedad',
    errorCreating: '❌ Lo siento, ocurrió un error al crear la propiedad.\n\nPor favor intenta de nuevo escribiendo *"quiero crear una propiedad"*.',
    errorAnalyzing: '❌ Tuve un problema analizando la información. Por favor intenta de nuevo o escribe los datos más claramente.',
    errorPhoto: '❌ Tuve un problema guardando esa foto. Intenta enviarla de nuevo.',
    errorPhotoProcessing: '❌ Tuve un problema procesando esa foto. Intenta enviarla de nuevo.',
    errorAudio: '❌ No pude transcribir ese audio. Intenta enviarlo de nuevo o escribe el mensaje.',
    videoNotSupported: '⚠️ No puedo procesar videos aquí. Solo acepto fotos (JPEG o PNG). Agrega los videos desde la aplicación después de crear la propiedad.',
    errorParsingSummary: '⚠️ No pude leer los datos del resumen correctamente. Escribe *LISTO* para que vuelva a analizar la información.',
    queFaltaAllGood: '✅ Ya tienes todo lo necesario. Escribe *LISTO* cuando quieras que revise la información.',
    queFaltaList: (list: string) => '📋 Aún me faltan estos datos:\n\n' + list + '\n\nEnvíalos cuando quieras y escribe *LISTO* al terminar.',
    fieldLabels: {
      title: 'Título de la propiedad',
      price: 'Precio',
      currency_id: 'Divisa (colones o dólares)',
      city: 'Ciudad',
      address: 'Dirección',
      state_province: 'Provincia',
      property_type: 'Tipo de propiedad',
      listing_type: 'Tipo de negocio (Venta o Alquiler)',
      maps_url: 'Link de Google Maps de la ubicación',
    },
    queFaltaItems: {
      title: '📌 Título de la propiedad',
      price: '💰 Precio',
      currency: '💱 Divisa (colones o dólares)',
      city: '🌆 Ciudad',
      property_type: '🏷️ Tipo de propiedad',
      listing_type: '📋 Tipo de negocio (Venta o Alquiler)',
      maps_url: '📍 Link de Google Maps',
      photos: (count: number, min: number) => '🖼️ Fotos (tienes ' + count + ', necesito al menos ' + min + ')',
    },
    summaryFields: {
      title: '📌 *Título:*',
      type: '🏷️ *Tipo:*',
      listing: '📋 *Negocio:*',
      price: '💰 *Precio:*',
      province: '📍 *Provincia:*',
      city: '🌆 *Ciudad:*',
      address: '🏠 *Dirección:*',
      maps: '📍 *Google Maps:*',
      language: '🌐 *Idioma:*',
      photos: '🖼️ *Fotos:*',
      noValue: 'No indicada',
      noMap: 'No indicado',
      langEs: 'Español',
      langEn: 'Inglés',
    },
    typeMap: { house: 'Casa', condo: 'Condominio', apartment: 'Apartamento', land: 'Terreno', finca: 'Finca', quinta: 'Quinta', commercial: 'Comercial', hotel: 'Hotel', other: 'Otros' },
    listingMap: { sale: 'Venta', rent: 'Alquiler' },
    extractionPrompt:
      'Eres un extractor de datos para fichas de propiedades inmobiliarias en Costa Rica.\n'
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
      + '  "language": "es",\n'
      + '  "maps_url": "string o null (link de Google Maps compartido por el agente)",\n'
      + '  "campos_faltantes": ["lista de campos obligatorios que aún faltan"]\n'
      + '}\n\n'
      + 'Campos obligatorios: title, price, currency_id, city, property_type, listing_type, maps_url.\n'
      + 'Tipos de propiedad: house=Casa, condo=Condominio, apartment=Apartamento, land=Terreno/Lote, finca=Finca, quinta=Quinta, commercial=Comercial/Negocio/Local, hotel=Hotel, other=Otros.\n'
      + 'Tipos de negocio: sale=venta/vender/compra. rent=alquiler/arrendar/rentar.',
    unrecognizedType:
      'Tipo de propiedad no reconocido. Indica uno de estos:\n'
      + '   🏠 Casa\n   🏢 Condominio\n   🏙️ Apartamento\n   🌿 Terreno\n'
      + '   🌳 Finca\n   🏡 Quinta\n   🏬 Comercial\n   🏨 Hotel\n   📦 Otros',
    descriptionPrompt: (lines: string) =>
      'Eres un redactor especializado en bienes raíces en Costa Rica.\n'
      + 'Escribe una descripción atractiva y natural para esta propiedad. '
      + 'Máximo 3 oraciones. No uses frases genéricas como "no te pierdas esta oportunidad" o "llama ya". '
      + 'Que suene humana, específica y enfocada en los puntos fuertes reales de la propiedad. '
      + 'Responde ÚNICAMENTE con el texto de la descripción, sin comillas ni encabezados.\n\n'
      + 'Datos de la propiedad:\n' + lines,
  },
  en: {
    languageQuestion:
      '🌐 ¿En qué idioma vas a crear esta propiedad? / What language will you use for this property?\n\n'
      + '🇨🇷 *1.* Español\n'
      + '🇺🇸 *2.* English',
    welcomeFlow: (name: string) =>
      'Perfect ' + name + '! 🏠 Let\'s create a new property listing.\n\n'
      + 'You can send me the information in any order — *in writing or by voice note* 🎤. Here\'s what I need:\n\n'
      + '📌 *Title* of the property\n'
      + '💰 *Price* and *currency* (colones or dollars)\n'
      + '🏷️ *Type* (House, Apartment, Farm, Commercial space, etc.)\n'
      + '📋 *Listing type* (Sale or Rent)\n'
      + '🌍 *Province*, *city* and *address*\n'
      + '📍 *Google Maps link* of the location\n'
      + '🖼️ *Photos* (minimum ' + PHOTO_MIN + ', maximum ' + PHOTO_MAX + ' images)\n\n'
      + '_You can send each detail separately or all at once, in any order._\n'
      + '_For photos, send them in groups of up to 5 at a time so they process correctly._\n'
      + '_If you\'re not sure what\'s missing, type *"What\'s missing?"* or simply *"0"* and I\'ll let you know._\n'
      + 'When you\'re done, type *READY* and I\'ll review everything before creating the listing.',
    ack: '📝 Got it. Keep sending the property information. When you\'re done, type *READY*.\n_If you\'re not sure what\'s missing, type *"What\'s missing?"* or simply *"0"*_',
    cancelled: (name: string) => 'Understood ' + name + ', I cancelled the property creation. How else can I help you?',
    notEnoughPhotos: (min: number, count: number) =>
      '⚠️ I still need at least *' + min + ' photos* to create the listing. You currently have *' + count + '*. Send them and type READY again.',
    analyzing: (count: number) =>
      '⏳ Analyzing the information you sent me... _(' + count + ' photo' + (count !== 1 ? 's' : '') + ' received)_ — Just a moment 📋',
    missingFields: (list: string) =>
      '⚠️ Some data is missing to create the property:\n\n' + list + '\n\nSend them and type *READY* again when you\'re done.\n_If you\'re not sure what\'s missing, type *"What\'s missing?"* or *"0"*_',
    missingCustomFields: (list: string) =>
      '📋 This property has additional fields I need to complete:\n\n' + list + '\n\nSend them and type *READY* again when you\'re done.',
    summaryHeader: '✅ *Property summary:*',
    summaryConfirmPrompt: 'Is everything correct? Reply *YES* to create the property, or correct anything that\'s wrong.',
    confirmationMarker: 'Is everything correct? Reply *YES*',
    creating: (name: string) => '⏳ Perfect ' + name + ', creating your property... Give me a moment.',
    successMessage: (title: string, editUrl: string, shareUrl: string) =>
      '✅ Your property was created successfully!\n\n'
      + '*' + title + '*\n\n'
      + '✏️ *Edit and add videos:*\n' + editUrl + '\n\n'
      + '🔗 *Share link with clients:*\n' + shareUrl + '\n\n'
      + '---\n'
      + 'What would you like to do now?\n\n'
      + '🔍 *1.* Search properties\n'
      + '📄 *2.* Send a property PDF\n'
      + '🪪 *3.* My digital card\n'
      + '⛰️ *4.* Elevation of a place\n'
      + '🏠 *5.* Create another property',
    errorCreating: '❌ Sorry, an error occurred while creating the property.\n\nPlease try again by typing *"I want to create a property"*.',
    errorAnalyzing: '❌ I had trouble analyzing the information. Please try again or write the details more clearly.',
    errorPhoto: '❌ I had trouble saving that photo. Please try sending it again.',
    errorPhotoProcessing: '❌ I had trouble processing that photo. Please try sending it again.',
    errorAudio: '❌ I couldn\'t transcribe that voice note. Please try sending it again or type the message.',
    videoNotSupported: '⚠️ I can\'t process videos here. I only accept photos (JPEG or PNG). You can add videos from the app after creating the listing.',
    errorParsingSummary: '⚠️ I couldn\'t read the summary data correctly. Type *READY* so I can re-analyze the information.',
    queFaltaAllGood: '✅ You have everything I need. Type *READY* whenever you want me to review the information.',
    queFaltaList: (list: string) => '📋 I still need the following:\n\n' + list + '\n\nSend them whenever you\'re ready and type *READY* when done.',
    fieldLabels: {
      title: 'Property title',
      price: 'Price',
      currency_id: 'Currency (colones or dollars)',
      city: 'City',
      address: 'Address',
      state_province: 'Province',
      property_type: 'Property type',
      listing_type: 'Listing type (Sale or Rent)',
      maps_url: 'Google Maps link',
    },
    queFaltaItems: {
      title: '📌 Property title',
      price: '💰 Price',
      currency: '💱 Currency (colones or dollars)',
      city: '🌆 City',
      property_type: '🏷️ Property type',
      listing_type: '📋 Listing type (Sale or Rent)',
      maps_url: '📍 Google Maps link',
      photos: (count: number, min: number) => '🖼️ Photos (you have ' + count + ', I need at least ' + min + ')',
    },
    summaryFields: {
      title: '📌 *Title:*',
      type: '🏷️ *Type:*',
      listing: '📋 *Listing:*',
      price: '💰 *Price:*',
      province: '📍 *Province:*',
      city: '🌆 *City:*',
      address: '🏠 *Address:*',
      maps: '📍 *Google Maps:*',
      language: '🌐 *Language:*',
      photos: '🖼️ *Photos:*',
      noValue: 'Not provided',
      noMap: 'Not provided',
      langEs: 'Spanish',
      langEn: 'English',
    },
    typeMap: { house: 'House', condo: 'Condo', apartment: 'Apartment', land: 'Land', finca: 'Farm', quinta: 'Country house', commercial: 'Commercial', hotel: 'Hotel', other: 'Other' },
    listingMap: { sale: 'Sale', rent: 'Rent' },
    extractionPrompt:
      'You are a data extractor for real estate property listings in Costa Rica.\n'
      + 'Analyze the conversation history and extract the property fields.\n'
      + 'Return ONLY valid JSON with no additional text or backticks.\n\n'
      + 'Fields to extract:\n'
      + '{\n'
      + '  "title": "string or null",\n'
      + '  "price": "number or null (extract the number, e.g. 78000000 if it says 78 million)",\n'
      + '  "currency_id": "RULE: if colones/CRC/₡ mentioned → ec8528a3-d504-47fa-97db-2c07716d8b47. If dollars/USD/$ → 839f44d5-bee2-4bc1-b5da-50364f14c681. null if no currency mentioned.",\n'
      + '  "city": "string or null",\n'
      + '  "address": "string or null",\n'
      + '  "state_province": "string or null (province in Costa Rica)",\n'
      + '  "property_type": "house | condo | apartment | land | finca | quinta | commercial | hotel | other",\n'
      + '  "listing_type": "sale if selling | rent if renting",\n'
      + '  "language": "en",\n'
      + '  "maps_url": "string or null (Google Maps link shared by the agent)",\n'
      + '  "campos_faltantes": ["list of required fields still missing"]\n'
      + '}\n\n'
      + 'Required fields: title, price, currency_id, city, property_type, listing_type, maps_url.\n'
      + 'Property types: house, condo, apartment, land, finca, quinta, commercial, hotel, other.\n'
      + 'Listing types: sale=selling/for sale. rent=renting/for rent.',
    unrecognizedType:
      'Property type not recognized. Please specify one of these:\n'
      + '   🏠 House\n   🏢 Condo\n   🏙️ Apartment\n   🌿 Land\n'
      + '   🌳 Farm\n   🏡 Country house\n   🏬 Commercial\n   🏨 Hotel\n   📦 Other',
    descriptionPrompt: (lines: string) =>
      'You are a real estate copywriter specializing in Costa Rica properties.\n'
      + 'Write an attractive and natural description for this property. '
      + 'Maximum 3 sentences. Avoid generic phrases like "don\'t miss this opportunity" or "call now". '
      + 'Make it sound human, specific, and focused on the real highlights of the property. '
      + 'Reply ONLY with the description text, no quotes or headings.\n\n'
      + 'Property details:\n' + lines,
  },
} as const;

// ── DB helpers ────────────────────────────────────────────────────────────────

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

// ── Flow initiation ───────────────────────────────────────────────────────────

// Step 1: ask the agent which language to use for this property.
// The actual flow welcome message is sent after language selection.
export async function handleIniciarCreacion(
  agentId: string,
  cleanNumber: string,
) {
  await supabaseAdmin
    .from('agent_property_draft')
    .delete()
    .eq('agent_id', agentId);

  // Create draft with no language yet — awaiting selection
  await upsertDraft(agentId, { photos: [], pending_photos: 0, flow_language: null } as any);

  await sendQueued(agentId, cleanNumber, MESSAGES.es.languageQuestion);
}

// Step 2: agent replied with 1 (ES) or 2 (EN) — save language and start flow.
export async function handleLanguageSelection(
  agentId: string,
  cleanNumber: string,
  primerNombre: string,
  selection: string
): Promise<boolean> {
  const lang: FlowLanguage = selection.trim() === '2' ? 'en' : 'es';
  await upsertDraft(agentId, { flow_language: lang });
  const msg = MESSAGES[lang];
  await sendQueued(agentId, cleanNumber, msg.welcomeFlow(primerNombre));
  return true;
}

// ── Media handling ────────────────────────────────────────────────────────────

export async function handleMediaEnDraft(
  agentId: string,
  cleanNumber: string,
  messageId: string,
  message: Record<string, any>,
  lang: FlowLanguage,
  watermarkConfig?: AgentWatermarkConfig
): Promise<string | null> {
  const mediaInfo = extractMediaInfo(message);
  if (!mediaInfo) return null;
  const msg = MESSAGES[lang];

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
        return msg.errorPhoto;
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
      return msg.errorPhotoProcessing;
    }
  }

  if (mediaInfo.type === 'audio') {
    try {
      const { publicUrl } = await decryptWasenderMedia(messageId, mediaInfo.messageObject);
      const transcripcion = await transcribeAudioFromUrl(publicUrl);

      await supabaseAdmin
        .from('chat_messages')
        .insert({ agent_id: agentId, role: 'user', content: transcripcion });

      return '🎙️ _' + (lang === 'en' ? 'Voice note transcribed:' : 'Audio transcrito:') + '_ ' + transcripcion;
    } catch (error) {
      console.error('Error transcribing audio in draft:', error);
      return msg.errorAudio;
    }
  }

  if (mediaInfo.type === 'video') {
    return msg.videoNotSupported;
  }

  return null;
}

// ── LISTO / READY handler ─────────────────────────────────────────────────────

export async function handleListo(
  agentId: string,
  cleanNumber: string,
  primerNombre: string,
  draftCreatedAt: string,
  lang: FlowLanguage
) {
  const draft = await getDraft(agentId);
  // Always use the persisted flow_language as source of truth.
  // The lang param from route.ts may be stale if the draft was just created.
  const resolvedLang: FlowLanguage = draft?.flow_language || lang;
  const msg = MESSAGES[resolvedLang];

  const photoCount = draft?.photos?.length || 0;
  if (photoCount < PHOTO_MIN) {
    await sendQueued(agentId, cleanNumber, msg.notEnoughPhotos(PHOTO_MIN, photoCount));
    return;
  }

  await sendQueued(agentId, cleanNumber, msg.analyzing(photoCount));

  const history = await loadDraftHistory(agentId, draftCreatedAt);

  const historyMessages = history.map(function(m) {
    return { role: m.role as 'user' | 'assistant', content: m.content };
  });

  let extractedData: any = null;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: msg.extractionPrompt },
        ...historyMessages,
        { role: 'user', content: resolvedLang === 'en' ? 'Extract the property data from the conversation.' : 'Extrae los datos de la propiedad del historial.' },
      ],
      temperature: 0,
    });

    const raw = completion.choices[0].message.content || '{}';
    extractedData = JSON.parse(raw.replace(/```json|```/g, '').trim());
  } catch (error) {
    console.error('Error extracting property data:', error);
    await sendQueued(agentId, cleanNumber, msg.errorAnalyzing);
    return;
  }

  // Unrecognized property type
  if (extractedData.property_type === 'other') {
    const historyText = history.map(function(m) { return m.content; }).join(' ').toLowerCase();
    const saidOther = /\bother\b|\botros\b|\botro\b/.test(historyText);
    if (!saidOther) {
      extractedData.campos_faltantes = extractedData.campos_faltantes || [];
      extractedData.campos_faltantes.push(msg.unrecognizedType);
      extractedData.property_type = null;
    }
  }

  const camposFaltantes: string[] = extractedData.campos_faltantes || [];
  if (camposFaltantes.length > 0) {
    const lista = camposFaltantes.map(function(c: string) {
      return '• ' + ((msg.fieldLabels as any)[c] || c);
    }).join('\n');
    await sendQueued(agentId, cleanNumber, msg.missingFields(lista));
    return;
  }

  // ── Extract custom field values ───────────────────────────────────────────
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
      null, 2
    );

    const cfSystemPrompt = resolvedLang === 'en'
      ? 'You are a data extractor for custom property fields. Analyze the conversation and return ONLY valid JSON without backticks. Use null for missing values.\n\nFields to extract:\n' + cfFieldsList
      : 'Eres un extractor de valores para campos personalizados. Analiza la conversación y devuelve ÚNICAMENTE un JSON válido sin backticks. Usa null para valores no mencionados.\n\nCampos a extraer:\n' + cfFieldsList;

    try {
      const cfCompletion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: cfSystemPrompt },
          ...historyMessages,
          { role: 'user', content: resolvedLang === 'en' ? 'Extract the custom field values from the conversation.' : 'Extrae los valores de los campos personalizados del historial.' },
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

    const missingCustomFields = customFieldDefs.filter(function(cf) {
      return !customFieldValues[cf.field_key] && customFieldValues[cf.field_key] !== 0;
    });

    if (missingCustomFields.length > 0) {
      const lista = missingCustomFields.map(function(cf) {
        return (cf.icon || '🏷️') + ' *' + cf.field_name + '*' + (cf.placeholder ? ' _(ej: ' + cf.placeholder + ')_' : '');
      }).join('\n');
      await sendQueued(agentId, cleanNumber, msg.missingCustomFields(lista));
      return;
    }
  }

  // ── Build and send summary ────────────────────────────────────────────────
  const sf = msg.summaryFields;
  const tm = msg.typeMap as Record<string, string>;
  const lm = msg.listingMap as Record<string, string>;
  const divisa = extractedData.currency_id === '839f44d5-bee2-4bc1-b5da-50364f14c681' ? 'USD' : 'CRC';

  let customFieldsResumen = '';
  if (customFieldDefs.length > 0) {
    const lineas = customFieldDefs.map(function(cf) {
      const valor = customFieldValues[cf.field_key];
      return (cf.icon || '🏷️') + ' *' + cf.field_name + ':* ' + (valor !== undefined && valor !== null ? valor : sf.noValue);
    }).join('\n');
    customFieldsResumen = '\n' + lineas;
  }

  const resumen = msg.summaryHeader + '\n\n'
    + sf.title + ' ' + extractedData.title + '\n'
    + sf.type + ' ' + (tm[extractedData.property_type] || extractedData.property_type) + '\n'
    + sf.listing + ' ' + (lm[extractedData.listing_type] || extractedData.listing_type) + '\n'
    + sf.price + ' ' + (extractedData.price?.toLocaleString('es-CR')) + ' ' + divisa + '\n'
    + sf.province + ' ' + (extractedData.state_province || sf.noValue) + '\n'
    + sf.city + ' ' + extractedData.city + '\n'
    + sf.address + ' ' + (extractedData.address || sf.noValue) + '\n'
    + sf.maps + ' ' + (extractedData.maps_url || sf.noMap) + '\n'
    + sf.language + ' ' + (extractedData.language === 'es' ? sf.langEs : sf.langEn) + '\n'
    + sf.photos + ' ' + photoCount
    + customFieldsResumen + '\n\n'
    + msg.summaryConfirmPrompt;

  await sendQueued(agentId, cleanNumber, resumen);
  await saveMessage(agentId, 'assistant', resumen);
  await upsertDraft(agentId, { pending_photos: photoCount });
}

// ── Summary parser ────────────────────────────────────────────────────────────

// Parses the confirmed summary text to extract all property fields.
// This is the single source of truth — the summary was shown to the agent and confirmed.
function parseSummaryText(
  summaryText: string,
  lang: FlowLanguage,
  draftPhotos: string[],
  customFieldDefs: Array<{ field_key: string; field_name: string; icon?: string }>
): PropertyData {
  const getField = (label: string): string | null => {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp('\\*?' + escaped + '\\*?\\s*(.+)', 'i');
    const match = summaryText.match(regex);
    return match ? match[1].replace(/\*/g, '').trim() : null;
  };

  const sf = MESSAGES[lang].summaryFields;
  const titleRaw    = getField('Title:') || getField('Título:');
  const typeRaw     = getField('Type:') || getField('Tipo:');
  const listingRaw  = getField('Listing:') || getField('Negocio:');
  const priceRaw    = getField('Price:') || getField('Precio:');
  const provinceRaw = getField('Province:') || getField('Provincia:');
  const cityRaw     = getField('City:') || getField('Ciudad:');
  const addressRaw  = getField('Address:') || getField('Dirección:');
  const mapsRaw     = getField('Google Maps:');
  const langRaw     = getField('Language:') || getField('Idioma:');

  const typeReverse: Record<string, string> = {
    'Casa': 'house', 'House': 'house',
    'Condominio': 'condo', 'Condo': 'condo',
    'Apartamento': 'apartment', 'Apartment': 'apartment',
    'Terreno': 'land', 'Land': 'land',
    'Finca': 'finca', 'Farm': 'finca',
    'Quinta': 'quinta', 'Country house': 'quinta',
    'Comercial': 'commercial', 'Commercial': 'commercial',
    'Hotel': 'hotel',
    'Otros': 'other', 'Other': 'other',
  };
  const listingReverse: Record<string, string> = {
    'Venta': 'sale', 'Sale': 'sale',
    'Alquiler': 'rent', 'Rent': 'rent',
  };

  let price = 0;
  let currency_id = '839f44d5-bee2-4bc1-b5da-50364f14c681';
  if (priceRaw) {
    const normalized = priceRaw.replace(/[\s.]/g, '').replace(',', '.');
    const numMatch = normalized.match(/[\d]+(?:\.\d+)?/);
    if (numMatch) price = parseFloat(numMatch[0]);
    if (/CRC|₡|colones/i.test(priceRaw)) {
      currency_id = 'ec8528a3-d504-47fa-97db-2c07716d8b47';
    }
  }

  const noValue = sf.noValue;
  const noMap = sf.noMap;

  const customFieldValues: Record<string, string | number> = {};
  customFieldDefs.forEach(function(cf) {
    const val = getField(cf.field_name + ':');
    if (val && val !== noValue) {
      customFieldValues[cf.field_key] = val;
    }
  });

  // Language is always the flow_language chosen by the agent at the start,
  // never inferred from the summary text or the conversation.
  return {
    title: titleRaw || 'Property',
    price,
    currency_id,
    city: cityRaw || '',
    address: (addressRaw && addressRaw !== noValue) ? addressRaw : undefined,
    state_province: (provinceRaw && provinceRaw !== noValue) ? provinceRaw : undefined,
    property_type: typeRaw ? (typeReverse[typeRaw] || 'other') : 'other',
    listing_type: listingRaw ? (listingReverse[listingRaw] || 'sale') : 'sale',
    language: lang,
    maps_url: (mapsRaw && mapsRaw !== noMap) ? mapsRaw : undefined,
    photos: draftPhotos,
    custom_fields_data: customFieldValues,
  };
}

// ── AI description generator ──────────────────────────────────────────────────

async function generateDescription(data: PropertyData, lang: FlowLanguage): Promise<string> {
  const msg = MESSAGES[lang];
  const tm = msg.typeMap as Record<string, string>;
  const lm = msg.listingMap as Record<string, string>;

  const currencyLabel = data.currency_id === '839f44d5-bee2-4bc1-b5da-50364f14c681' ? 'USD' : '₡';
  const priceFormatted = data.price ? data.price.toLocaleString('es-CR') + ' ' + currencyLabel : null;
  const typeLabel = tm[data.property_type] || 'Property';
  const listingLabel = lm[data.listing_type] || '';

  const contextLines: string[] = [
    'Type: ' + typeLabel + ' ' + listingLabel,
    data.city ? 'Location: ' + data.city + (data.state_province ? ', ' + data.state_province : '') : null,
    data.address ? 'Address: ' + data.address : null,
    priceFormatted ? 'Price: ' + priceFormatted : null,
  ].filter(Boolean) as string[];

  if (data.custom_fields_data && Object.keys(data.custom_fields_data).length > 0) {
    Object.entries(data.custom_fields_data).forEach(([key, val]) => {
      if (val !== null && val !== undefined && val !== '') {
        contextLines.push(key + ': ' + val);
      }
    });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: msg.descriptionPrompt(contextLines.join('\n')) }],
      temperature: 0.7,
      max_tokens: 200,
    });
    return completion.choices[0].message.content?.trim() || typeLabel + ' ' + listingLabel + ' in ' + (data.city || 'Costa Rica') + '.';
  } catch (err) {
    console.error('[generateDescription] OpenAI error:', err);
    return typeLabel + ' ' + listingLabel + ' in ' + (data.city || 'Costa Rica') + '.';
  }
}

// ── Confirmation handler ──────────────────────────────────────────────────────

export async function handleConfirmacion(
  agentId: string,
  cleanNumber: string,
  primerNombre: string,
  lastBotContent: string,
  lang: FlowLanguage
) {
  const draft = await getDraft(agentId);
  // Always use the persisted flow_language as source of truth.
  // The lang param from route.ts may be stale if the draft was just created.
  const resolvedLang: FlowLanguage = draft?.flow_language || lang;
  const msg = MESSAGES[resolvedLang];

  if (!draft) {
    await sendQueued(agentId, cleanNumber, msg.errorCreating);
    return;
  }

  // Load custom field definitions to extract their values from the summary
  let customFieldDefs: Array<{ field_key: string; field_name: string; icon?: string }> = [];
  const typeMatch = lastBotContent.match(/🏷️\s*\*?(?:Type|Tipo):\*?\s*(.+)/);
  const listingMatch = lastBotContent.match(/📋\s*\*?(?:Listing|Negocio):\*?\s*(.+)/);
  const typeReverse: Record<string, string> = {
    'Casa': 'house', 'House': 'house', 'Condominio': 'condo', 'Condo': 'condo',
    'Apartamento': 'apartment', 'Apartment': 'apartment', 'Terreno': 'land', 'Land': 'land',
    'Finca': 'finca', 'Farm': 'finca', 'Quinta': 'quinta', 'Country house': 'quinta',
    'Comercial': 'commercial', 'Commercial': 'commercial', 'Hotel': 'hotel',
    'Otros': 'other', 'Other': 'other',
  };
  const listingReverse: Record<string, string> = {
    'Venta': 'sale', 'Sale': 'sale', 'Alquiler': 'rent', 'Rent': 'rent',
  };
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

  // Parse all property data from the confirmed summary — single source of truth
  const propertyData = parseSummaryText(lastBotContent, resolvedLang, draft.photos || [], customFieldDefs);

  if (!propertyData.title || !propertyData.price || !propertyData.city) {
    console.error('[handleConfirmacion] Could not parse critical fields from summary:', {
      title: propertyData.title,
      price: propertyData.price,
      city: propertyData.city,
    });
    await sendQueued(agentId, cleanNumber, msg.errorParsingSummary);
    return;
  }

  // Generate AI description — always, since it's never in the summary
  propertyData.description = await generateDescription(propertyData, resolvedLang);

  await sendQueued(agentId, cleanNumber, msg.creating(primerNombre));
  await clearDraft(agentId);
  await createProperty(agentId, cleanNumber, propertyData, resolvedLang);
}

// ── Property creation ─────────────────────────────────────────────────────────

async function createProperty(
  agentId: string,
  cleanNumber: string,
  data: PropertyData,
  lang: FlowLanguage
) {
  const msg = MESSAGES[lang];
  try {
    const baseSlug = (data.title || 'property')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const slug = baseSlug + '-' + Date.now().toString(36);

    let latitude: string | null = null;
    let longitude: string | null = null;

    if (data.maps_url) {
      const coords = await extractCoordinatesFromMapsUrl(data.maps_url);
      if (coords) { latitude = coords.lat; longitude = coords.lng; }
    }

    if (!latitude || !longitude) {
      const coords = await geocodeByCity(data.city || '', data.state_province);
      if (coords) { latitude = coords.lat; longitude = coords.lng; }
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

    // ── Move photos from draft-* folder to {slug}/ ──────────────────────────
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
          .upload(newPath, fileBuffer, { contentType: 'image/jpeg', cacheControl: '3600', upsert: false });

        if (uploadError) {
          console.error('[move-photos] Upload failed for ' + newPath + ':', uploadError);
          continue;
        }

        const { data: newUrlData } = supabaseAdmin.storage.from('property-photos').getPublicUrl(newPath);
        movedPhotoUrls.push(newUrlData.publicUrl);
        await supabaseAdmin.storage.from('property-photos').remove([originalPath]);

      } catch (err) {
        console.error('[move-photos] Unexpected error for photo ' + i + ':', err);
      }
    }

    if (movedPhotoUrls.length > 0) {
      await supabaseAdmin.from('properties').update({ photos: movedPhotoUrls }).eq('id', property.id);
    }

    await supabaseAdmin
      .from('agent_last_property_shown')
      .upsert({ agent_id: agentId, slug: property.slug }, { onConflict: 'agent_id' });

    const editUrl = BASE_DOMAIN + '/edit-property/' + property.id;
    const shareUrl = BASE_DOMAIN + '/p/' + property.slug;

    await sendQueued(agentId, cleanNumber, msg.successMessage(data.title, editUrl, shareUrl));
  } catch (error: any) {
    console.error('Error creating property:', error);
    await failDraft(agentId, error.message);
    await sendQueued(agentId, cleanNumber, msg.errorCreating);
  }
}

// ── Detection helpers ─────────────────────────────────────────────────────────

export function esConfirmacionSi(text: string): boolean {
  return /^(s[ií]|sí|si|dale|correcto|exacto|ok|okay|va|confirmo|confirmar|así es|todo bien|todo correcto|yes|yep|correct|confirmed|looks good|all good|that'?s correct|that is correct)\.?!?$/i.test(text.trim());
}

export function esComandoListo(text: string, lang: FlowLanguage = 'es'): boolean {
  if (lang === 'en') return /^ready\.?!?$/i.test(text.trim());
  return /^listo\.?!?$/i.test(text.trim());
}

export function esSeleccionIdioma(text: string): boolean {
  return /^[12]$/.test(text.trim());
}

export function esIntentCancelar(text: string): boolean {
  return /no (quiero|deseo|me interesa)|cancelar|cancela|salir|olvida|olvidalo|olv[ií]dalo|dejalo|d[eé]jalo|^para(r)?$|abort|ya no|no (sigo|continúo|continuo)|cancel|stop|exit|quit|never mind|forget it/i.test(text.trim());
}

export function esIntentCrearPropiedad(text: string): boolean {
  return /crear\s+(una\s+)?propiedad|nueva\s+propiedad|agregar\s+(una\s+)?propiedad|subir\s+(una\s+)?propiedad|añadir\s+(una\s+)?propiedad|create\s+(a\s+)?property|new\s+property|add\s+(a\s+)?property|list\s+(a\s+)?property/i.test(text);
}

export function esConsultaQueFalta(text: string): boolean {
  if (text.trim() === '0') return true;
  return /qu[eé]\s+(me\s+)?falta|qu[eé]\s+datos\s+faltan|qu[eé]\s+falta\s+por|qu[eé]\s+me\s+hace\s+falta|falta\s+algo|qu[eé]\s+necesitas|what('?s|\s+is)\s+(else\s+)?missing|what\s+(else\s+)?do\s+you\s+need|missing\s+fields?/i.test(text.trim());
}

// ── "What's missing?" handler ─────────────────────────────────────────────────

export async function handleQueFalta(
  agentId: string,
  cleanNumber: string,
  draft: PropertyDraft | null,
  draftCreatedAt: string,
  lang: FlowLanguage
): Promise<string> {
  const photoCount = draft?.photos?.length || 0;
  const history = await loadDraftHistory(agentId, draftCreatedAt);
  const msg = MESSAGES[lang];
  const qi = msg.queFaltaItems;

  const quickPrompt = lang === 'en'
    ? 'You are a data extractor for real estate listings. Analyze the conversation and return ONLY valid JSON showing which fields were provided. Use true if mentioned, false if not. NOTE: currency is true if any currency was mentioned.\n{\n  "title": boolean,\n  "price": boolean,\n  "currency": boolean,\n  "city": boolean,\n  "property_type": boolean,\n  "listing_type": boolean,\n  "maps_url": boolean\n}'
    : 'Eres un extractor de datos para fichas inmobiliarias. Analiza el historial y devuelve ÚNICAMENTE un JSON válido indicando qué campos ya fueron proporcionados. Responde con true si fue mencionado, false si no. NOTA: currency es true si se mencionó alguna divisa.\n{\n  "title": boolean,\n  "price": boolean,\n  "currency": boolean,\n  "city": boolean,\n  "property_type": boolean,\n  "listing_type": boolean,\n  "maps_url": boolean\n}';

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
        { role: 'user', content: lang === 'en' ? 'Which fields were provided?' : '¿Cuáles de estos campos ya fueron proporcionados?' },
      ],
      temperature: 0,
    });
    const raw = completion.choices[0].message.content || '{}';
    provided = JSON.parse(raw.replace(/```json|```/g, '').trim());
  } catch {
    provided = { title: false, price: false, currency: false, city: false, property_type: false, listing_type: false, maps_url: false };
  }

  const faltantes: string[] = [];
  if (!provided.title)         faltantes.push(qi.title);
  if (!provided.price)         faltantes.push(qi.price);
  if (!provided.currency)      faltantes.push(qi.currency);
  if (!provided.city)          faltantes.push(qi.city);
  if (!provided.property_type) faltantes.push(qi.property_type);
  if (!provided.listing_type)  faltantes.push(qi.listing_type);
  if (!provided.maps_url)      faltantes.push(qi.maps_url);
  if (photoCount < PHOTO_MIN)  faltantes.push(qi.photos(photoCount, PHOTO_MIN));

  if (faltantes.length === 0) return msg.queFaltaAllGood;
  return msg.queFaltaList(faltantes.join('\n'));
}