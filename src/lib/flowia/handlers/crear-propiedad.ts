import OpenAI from 'openai';
import { supabaseAdmin } from '@/lib/supabase';
import { sendWhatsAppMessage } from '@/lib/api/wasender';
import { decryptWasenderMedia, extractMediaInfo } from '../media/decrypt';
import { uploadPhotoFromUrl } from '../media/upload-photo';
import { transcribeAudioFromUrl } from '../media/transcribe-audio';
import { BASE_DOMAIN, PHOTO_MIN, PHOTO_MAX, delay } from '../constants';

// failDraft se usa internamente en crearPropiedadEnBackground

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── Tipos ────────────────────────────────────────────────────────────────────

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
  photos: string[];       // URLs de Supabase Storage ya subidas
  pending_photos: number; // fotos recibidas en WhatsApp aún no procesadas
}

// ─── Draft en Supabase ────────────────────────────────────────────────────────

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

// ─── Entrada al modo CREAR_PROPIEDAD ─────────────────────────────────────────

export async function handleIniciarCreacion(
  agentId: string,
  cleanNumber: string,
  primerNombre: string
) {
  // Limpiar cualquier draft previo e iniciar uno nuevo
  await supabaseAdmin
    .from('agent_property_draft')
    .delete()
    .eq('agent_id', agentId);

  await upsertDraft(agentId, { photos: [], pending_photos: 0 });

  const mensaje = `¡Perfecto ${primerNombre}! 🏠 Vamos a crear una nueva propiedad.

Puedes enviarme la información en el orden que prefieras, por escrito o por audio. Estos son los campos que necesito:

📌 *Título* de la propiedad
💰 *Precio* y *divisa* (USD o CRC)
🏷️ *Tipo* (Casa, Apartamento, Finca, Local Comercial, etc.)
📋 *Tipo de negocio* (Venta o Alquiler)
🌍 *Provincia*, *ciudad* y *dirección*
📍 *Link de Google Maps* de la ubicación
📝 *Descripción* de la propiedad
🌐 *Idioma* (Español o Inglés)
🖼️ *Fotos* (mínimo ${PHOTO_MIN}, máximo ${PHOTO_MAX} imágenes)

Cuando hayas enviado todo, escribe *LISTO* y yo verificaré la información antes de crear la propiedad.`;

  await sendWhatsAppMessage(cleanNumber, mensaje);
}

// ─── Procesamiento de media recibida en modo CREAR_PROPIEDAD ─────────────────

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
      const { publicUrl } = await decryptWasenderMedia(messageId, mediaInfo.messageObject);
      const draft = await getDraft(agentId);
      const currentPhotos = draft?.photos || [];
      const index = currentPhotos.length;

      if (index >= PHOTO_MAX) {
        return `Ya tienes ${PHOTO_MAX} fotos que es el máximo permitido. ✅`;
      }

      // Subir a Supabase Storage usando un slug temporal basado en agent_id
      const tempSlug = `draft-${agentId.substring(0, 8)}`;
      const supabaseUrl = await uploadPhotoFromUrl(agentId, tempSlug, publicUrl, index);

      const updatedPhotos = [...currentPhotos, supabaseUrl];
      await upsertDraft(agentId, { photos: updatedPhotos });

      const count = updatedPhotos.length;
      const faltanMensaje = count < PHOTO_MIN ? ` (necesito al menos ${PHOTO_MIN})` : ' ✅';
      return `📸 Foto ${count} recibida${faltanMensaje}`;
    } catch (error) {
      console.error('Error procesando imagen en draft:', error);
      return '❌ Tuve un problema procesando esa foto. Intenta enviarla de nuevo.';
    }
  }

  if (mediaInfo.type === 'audio') {
    // El audio se transcribe y se devuelve el texto para que el orquestador
    // lo trate como mensaje de texto normal dentro del flujo
    try {
      const { publicUrl } = await decryptWasenderMedia(messageId, mediaInfo.messageObject);
      const transcripcion = await transcribeAudioFromUrl(publicUrl);
      return `🎙️ _Audio transcrito:_ ${transcripcion}`;
    } catch (error) {
      console.error('Error transcribiendo audio en draft:', error);
      return '❌ No pude transcribir ese audio. Intenta enviarlo de nuevo o escribe el mensaje.';
    }
  }

  return null;
}

// ─── Procesamiento del comando LISTO ─────────────────────────────────────────

export async function handleListo(
  agentId: string,
  cleanNumber: string,
  primerNombre: string,
  history: Array<{ role: string; content: string }>
) {
  const draft = await getDraft(agentId);

  // Validar fotos primero (requisito duro)
  const photoCount = draft?.photos?.length || 0;
  if (photoCount < PHOTO_MIN) {
    await sendWhatsAppMessage(
      cleanNumber,
      `⚠️ Aún necesito al menos *${PHOTO_MIN} fotos* para crear la propiedad. Actualmente tienes *${photoCount}*. Envíalas y escribe LISTO de nuevo.`
    );
    return;
  }

  await sendWhatsAppMessage(cleanNumber, '⏳ Analizando la información que me enviaste...');

  // Extraer campos del historial con OpenAI
  const extractionPrompt = `Eres un extractor de datos para fichas de propiedades inmobiliarias.
Analiza el historial de conversación y extrae los campos de la propiedad.
Devuelve ÚNICAMENTE un JSON válido sin texto adicional ni backticks.

Campos a extraer:
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
  "maps_url": "string o null (link de Google Maps si fue compartido)",
  "campos_faltantes": ["lista de campos obligatorios que faltan"]
}

Campos obligatorios: title, description, price, currency_id, city, property_type, listing_type, language.
state_province y address son opcionales pero deseables.`;

  const messagesForExtraction = [
    { role: 'system' as const, content: extractionPrompt },
    ...history.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user' as const, content: 'Extrae los datos de la propiedad del historial anterior.' },
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
    console.error('Error extrayendo datos de la propiedad:', error);
    await sendWhatsAppMessage(
      cleanNumber,
      '❌ Tuve un problema analizando la información. Por favor intenta de nuevo o escribe los datos más claramente.'
    );
    return;
  }

  // Si hay campos faltantes, informar sin cerrar el modo
  const camposFaltantes: string[] = extractedData.campos_faltantes || [];
  if (camposFaltantes.length > 0) {
    const lista = camposFaltantes.map(c => `• ${c}`).join('\n');
    await sendWhatsAppMessage(
      cleanNumber,
      `⚠️ Faltan algunos datos para poder crear la propiedad:\n\n${lista}\n\nEnvíalos y escribe *LISTO* de nuevo cuando estés listo.`
    );
    return;
  }

  // Guardar datos extraídos en el draft
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

  // Mostrar resumen de confirmación
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
🌐 *Idioma:* ${extractedData.language === 'es' ? 'Español' : 'Inglés'}
🖼️ *Fotos:* ${photoCount}

¿Todo correcto? Responde *SÍ* para crear la propiedad, o corrígeme lo que esté mal.`;

  await sendWhatsAppMessage(cleanNumber, resumen);

  // Guardamos estado: esperando confirmación del agente
  await upsertDraft(agentId, { pending_photos: photoCount });
}

// ─── Procesamiento de la confirmación SÍ ─────────────────────────────────────

export async function handleConfirmacion(
  agentId: string,
  cleanNumber: string,
  primerNombre: string
) {
  const draft = await getDraft(agentId);

  if (!draft) {
    await sendWhatsAppMessage(cleanNumber, '❌ No encontré información de la propiedad. Por favor inicia el proceso de nuevo.');
    return;
  }

  await sendWhatsAppMessage(
    cleanNumber,
    `⏳ Perfecto ${primerNombre}, estoy creando tu propiedad. Te aviso cuando esté lista.`
  );

  // Cerrar el modo para que el agente pueda usar el asistente normal
  await clearDraft(agentId);

  // Crear la propiedad en background
  setImmediate(async () => {
    await crearPropiedadEnBackground(agentId, cleanNumber, draft);
  });
}

// ─── Creación asíncrona en background ────────────────────────────────────────

async function crearPropiedadEnBackground(
  agentId: string,
  cleanNumber: string,
  draft: PropertyDraft
) {
  try {
    // Generar slug único
    const baseSlug = (draft.title || 'propiedad')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const slug = `${baseSlug}-${Date.now().toString(36)}`;

    // Insertar directamente en Supabase con supabaseAdmin
    // (mismo patrón que el resto del webhook — no se necesita endpoint HTTP)
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
        photos: draft.photos,
        status: 'pending',
        slug,
        show_map: true,
        custom_fields_data: {},
      })
      .select('id, slug')
      .single();

    if (propertyError || !property) {
      throw new Error(propertyError?.message || 'Error desconocido al insertar la propiedad');
    }

    // Éxito — borrar el draft completamente
    await clearDraft(agentId);

    const editUrl = `${BASE_DOMAIN}/dashboard/properties/${property.slug}/edit`;
    const shareUrl = `${BASE_DOMAIN}/p/${property.slug}`;

    await sendWhatsAppMessage(
      cleanNumber,
      `✅ ¡Tu propiedad fue creada exitosamente!\n\n*${draft.title}*\n\n✏️ *Editar y agregar videos:*\n${editUrl}\n\n🔗 *Link para compartir con clientes:*\n${shareUrl}`
    );
  } catch (error: any) {
    console.error('Error creando propiedad en background:', error);

    // Error — marcar draft como fallido para debuggear, sin borrarlo
    await failDraft(agentId, error.message);

    await sendWhatsAppMessage(
      cleanNumber,
      `❌ Lo siento, ocurrió un error al crear la propiedad.\n\nPor favor intenta de nuevo escribiendo *"quiero crear una propiedad"*.`
    );
  }
}

// ─── Helper: detectar si el mensaje es una confirmación SÍ ───────────────────

export function esConfirmacionSi(text: string): boolean {
  return /^(s[ií]|sí|si|dale|correcto|exacto|ok|okay|va|confirmo|confirmar|así es|todo bien|todo correcto)\.?!?$/i.test(text.trim());
}

// ─── Helper: detectar si el mensaje es el comando LISTO ──────────────────────

export function esComandoListo(text: string): boolean {
  return /^listo\.?!?$/i.test(text.trim());
}

// ─── Helper: detectar intent de crear propiedad ──────────────────────────────

export function esIntentCrearPropiedad(text: string): boolean {
  return /crear\s+(una\s+)?propiedad|nueva\s+propiedad|agregar\s+(una\s+)?propiedad|subir\s+(una\s+)?propiedad|añadir\s+(una\s+)?propiedad/i.test(text);
}