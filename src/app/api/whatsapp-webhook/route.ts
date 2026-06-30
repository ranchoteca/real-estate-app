import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import OpenAI from 'openai';
import { getSystemPrompt } from '@/lib/ai/prompts';
import { sendWhatsAppMessage, formatForWhatsApp } from '@/lib/api/wasender';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const BASE_DOMAIN = 'https://www.flowestateai.com';
const PROPERTY_PATH = '/p/';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const CURRENCY_MAP: Record<string, { code: string; symbol: string }> = {
  'ec8528a3-d504-47fa-97db-2c07716d8b47': { code: 'CRC', symbol: '₡' },
  '839f44d5-bee2-4bc1-b5da-50364f14c681': { code: 'USD', symbol: '$' }
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.event !== 'messages.received') return NextResponse.json({ success: true, status: 'ignored_not_message_event' });
    
    const messagesData = body?.data?.messages;
    if (!messagesData) return NextResponse.json({ success: true, status: 'ignored_no_messages_data' });

    const cleanNumber = messagesData.key?.cleanedSenderPn;
    const messageText = messagesData.messageBody || '';
    if (!cleanNumber) return NextResponse.json({ success: true, status: 'ignored_no_sender' });

    const searchNumberWithPlus = cleanNumber.startsWith('+') ? cleanNumber : `+${cleanNumber}`;

    const { data: agent, error } = await supabaseAdmin
      .from('agents')
      .select('id, email, full_name, username, is_flowia_active')
      .or(`whatsapp_number.eq.${searchNumberWithPlus},whatsapp_number.eq.${cleanNumber}`)
      .single();

    if (error || !agent || !agent.is_flowia_active) {
      return NextResponse.json({ success: true, status: 'ignored_unauthorized_or_inactive' }); 
    }

    const primerNombre = agent.full_name ? agent.full_name.trim().split(' ')[0] : 'Agente';
    const linkTarjeta = agent.username ? `${BASE_DOMAIN}/agent/${agent.username}/card?lang=es` : BASE_DOMAIN;

    const tresHorasAtras = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    const { data: historyData } = await supabaseAdmin
      .from('chat_messages')
      .select('role, content')
      .eq('agent_id', agent.id)
      .gte('created_at', tresHorasAtras)
      .order('created_at', { ascending: false })
      .limit(15);

    const history = historyData ? [...historyData].reverse() : [];
    const isNewSession = history.length === 0;

    if (isNewSession) {
      const mensajeBienvenida = `¡Hola ${primerNombre}! 👋 Soy *Flow*, tu asistente inmobiliario.

    Esto es lo que puedo hacer por ti hoy:

    🔍 *Buscar propiedades* de tu inventario por ubicación, tipo o presupuesto.
    📄 *Enviarte el PDF* con la ficha de cualquier propiedad específica.
     🪪 *Compartir tu tarjeta digital* para que la envíes a tus clientes.
    ⛰️ *Obtener la altura de un lugar* que compartas usando google maps.

    ¿En qué te ayudo?`;

      await sendWhatsAppMessage(cleanNumber, mensajeBienvenida);
      await supabaseAdmin.from('chat_messages').insert({ 
        agent_id: agent.id, 
        role: 'assistant', 
        content: mensajeBienvenida 
      });
    }

    const hace30Segundos = new Date(Date.now() - 30 * 1000).toISOString();
    const { data: mensajeDuplicado } = await supabaseAdmin
      .from('chat_messages')
      .select('id')
      .eq('agent_id', agent.id)
      .eq('role', 'user')
      .eq('content', messageText)
      .gte('created_at', hace30Segundos)
      .maybeSingle();

    if (mensajeDuplicado) {
      console.log('⏳ Reintento de webhook de Wasender detectado. Ignorando para evitar colapso (429).');
      return NextResponse.json({ success: true, status: 'ignored_webhook_retry' });
    }

    await supabaseAdmin.from('chat_messages').insert({ agent_id: agent.id, role: 'user', content: messageText });

    const ultimoMensajeAsistente = history.length > 0 ? history[history.length - 1] : null;
    const ofrecioPdf = ultimoMensajeAsistente?.role === 'assistant' 
      && ultimoMensajeAsistente.content?.includes('¿Te gustaría que te envíe un PDF');

    const yaEnvioPdfRecientemente = ultimoMensajeAsistente?.role === 'assistant'
      && /pdf.*(enviado|generado)/i.test(ultimoMensajeAsistente.content || '');

    const esConfirmacionCorta = /^(s[ií]|s[ií] por favor|s[ií] me gustar[ií]a|dale|claro|ok|okay|va|porfa|porfavor)\.?!?$/i.test(messageText.trim());

    if (yaEnvioPdfRecientemente && esConfirmacionCorta && !ofrecioPdf) {
      const respuestaCierre = "Perfecto, dime en qué más puedo ayudarte.";
      await supabaseAdmin.from('chat_messages').insert({ agent_id: agent.id, role: 'assistant', content: respuestaCierre });
      await sendWhatsAppMessage(cleanNumber, respuestaCierre);
      return NextResponse.json({ success: true, status: 'closed_pdf_followup' });
    }
    
    if (ofrecioPdf && esConfirmacionCorta) {
      const { data: ultimaMostrada } = await supabaseAdmin
        .from('agent_last_property_shown')
        .select('slug')
        .eq('agent_id', agent.id)
        .maybeSingle();

      if (ultimaMostrada?.slug) {
        const slug = ultimaMostrada.slug;

        await sendWhatsAppMessage(cleanNumber, "⏳ *Generando el PDF de la propiedad...* Dame un momento por favor.");
        await delay(1200);

        const pdfUrl = `${BASE_DOMAIN}/api/pdf-generator?slug=${slug}&agent_id=${agent.id}&t=${Date.now()}`;
        await sendWhatsAppMessage(
          cleanNumber,
          `📄 Aquí tienes el documento detallado de la propiedad.`,
          pdfUrl,
          `Ficha-${slug}.pdf`
        );

        const respuestaFinal = "PDF enviado correctamente. 📄 Si necesitas algo más, aquí estoy para ayudarte.";
        await supabaseAdmin.from('chat_messages').insert({ agent_id: agent.id, role: 'assistant', content: respuestaFinal });
        await sendWhatsAppMessage(cleanNumber, respuestaFinal);

        return NextResponse.json({ success: true, status: 'pdf_sent_via_shortcut' });
      }
    }

    const systemPrompt = getSystemPrompt(primerNombre, isNewSession, linkTarjeta);

    const messages: any[] = [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: messageText }
    ];

    const tools = [
      {
        type: "function" as const,
        function: {
          name: "buscar_propiedades",
          description: "Busca propiedades aplicando filtros de texto, tipo de negocio y presupuestos exactos.",
          parameters: {
            type: "object",
            properties: {
              termino_busqueda: { type: "string" },
              precio_min: { type: "number" },
              precio_max: { type: "number" },
              moneda_referencia: { type: "string", enum: ["CRC", "USD"] },
              tipo_transaccion: { type: "string", enum: ["venta", "alquiler"] },
            },
          },
        },
      },
      {
        type: "function" as const,
        function: {
          name: "enviar_pdf_propiedad",
          description: "Úsalo ÚNICAMENTE cuando el agente pide un PDF. DEBES extraer el 'slug' exacto de la propiedad del contexto y enviarlo en los parámetros.",
          parameters: {
            type: "object",
            properties: {
              slug: { type: "string", description: "El slug exacto de la propiedad solicitada." },
            },
            required: ["slug"]
          },
        },
      },
      // Añade esto dentro de tu array 'tools' existente
      {
        type: "function" as const,
        function: {
          name: "calcular_altura_ubicacion",
          description: "Calcula la altitud (elevación) en metros sobre el nivel del mar a partir de un enlace de Google Maps compartido por el usuario.",
          parameters: {
            type: "object",
            properties: {
              url_google_maps: { 
                type: "string", 
                description: "El enlace de Google Maps extraído del mensaje del usuario (ej. https://maps.app.goo.gl/... o https://www.google.com/maps/...)." 
              },
            },
            required: ["url_google_maps"]
          },
        },
      }
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages,
      tools: tools,
      tool_choice: "auto",
    });

    const responseMessage = completion.choices[0].message;
    let textoFinalParaEnviar = "";

    if (responseMessage.tool_calls) {
      const toolCall = responseMessage.tool_calls[0];
      const functionName = toolCall.function.name;
      const args = JSON.parse(toolCall.function.arguments);

      if (functionName === "buscar_propiedades") {
        let query = supabaseAdmin
          .from('properties')
          .select('title, description, price, city, address, state, property_type, listing_type, currency_id, slug', { count: 'exact' })
          .eq('agent_id', agent.id);

        if (args.termino_busqueda) {
          query = query.or(`title.ilike.%${args.termino_busqueda}%,description.ilike.%${args.termino_busqueda}%,city.ilike.%${args.termino_busqueda}%,address.ilike.%${args.termino_busqueda}%,state.ilike.%${args.termino_busqueda}%`);
        }

        if (args.tipo_transaccion) {
          const dbListingType = args.tipo_transaccion.toLowerCase() === 'alquiler' ? 'rent' : 'sale';
          query = query.eq('listing_type', dbListingType);
        }

        let { data: properties, count, error: dbError } = await query.limit(5);
        if (dbError) console.error("❌ Error DB:", dbError);

        if (properties && properties.length > 0) {
          properties = properties.map(p => {
            const coin = CURRENCY_MAP[p.currency_id] || { code: 'CRC', symbol: '₡' };
            return {
              ...p,
              currency_code: coin.code,
              currency_symbol: coin.symbol,
              property_url: `${BASE_DOMAIN}${PROPERTY_PATH}${p.slug}`
            };
          });

          const tieneFiltroPrecio = args.precio_min !== undefined || args.precio_max !== undefined;
          const tieneFiltroMoneda = !!args.moneda_referencia;

          if (tieneFiltroPrecio || tieneFiltroMoneda) {
            const min = args.precio_min ?? 0;
            const max = args.precio_max ?? Infinity;
            const monedaFiltro = args.moneda_referencia;

            properties = properties.filter(p => {
              if (monedaFiltro && p.currency_code !== monedaFiltro) return false;
              if (tieneFiltroPrecio && (p.price < min || p.price > max)) return false;
              return true;
            });
          }

          if (properties.length === 1) {
            await supabaseAdmin
              .from('agent_last_property_shown')
              .upsert({ agent_id: agent.id, slug: properties[0].slug, updated_at: new Date().toISOString() });
          }
        }

        messages.push(responseMessage);
        messages.push({
          tool_call_id: toolCall.id,
          role: "tool",
          name: toolCall.function.name,
          content: JSON.stringify({
            total_encontradas: count || 0,
            propiedades_mostradas: properties?.length || 0,
            resultados: properties || [],
            instruccion_pdf: properties?.length === 1 
              ? "Hay UNA sola propiedad. Al final de tu respuesta, ofrece el PDF."
              : "Hay MÚLTIPLES propiedades. NO ofrezcas PDF bajo ninguna circunstancia."
            }),
        });

        const finalCompletion = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: messages,
        });

        textoFinalParaEnviar = finalCompletion.choices[0].message.content || "Lo siento, tuve un error al procesar la búsqueda.";

      } else if (functionName === "enviar_pdf_propiedad") {
        let slug = args.slug;

        const { data: propiedadValidada } = await supabaseAdmin
          .from('properties')
          .select('slug')
          .eq('agent_id', agent.id)
          .eq('slug', slug)
          .maybeSingle();

        if (!propiedadValidada) {
          const { data: ultimaMostrada } = await supabaseAdmin
            .from('agent_last_property_shown')
            .select('slug')
            .eq('agent_id', agent.id)
            .maybeSingle();

          slug = ultimaMostrada?.slug;
        }

        if (!slug) {
          textoFinalParaEnviar = "No logré identificar con certeza qué propiedad quieres en PDF. ¿Puedes confirmarme el nombre o la ubicación?";
        } else {

          await sendWhatsAppMessage(cleanNumber, "⏳ *Generando el PDF de la propiedad...* Dame un momento por favor.");
          await delay(1200);

          try {
            const pdfUrl = `${BASE_DOMAIN}/api/pdf-generator?slug=${slug}&agent_id=${agent.id}&t=${Date.now()}`;

            await sendWhatsAppMessage(
              cleanNumber, 
              `📄 Aquí tienes el documento detallado de la propiedad.`, 
              pdfUrl, 
              `Ficha-${slug}.pdf`
            );
            await delay(1200);

            messages.push(responseMessage);
            messages.push({
              tool_call_id: toolCall.id,
              role: "tool",
              name: toolCall.function.name,
              content: JSON.stringify({ success: true, message: "PDF generado y enviado exitosamente." }),
            });

            const finalCompletion = await openai.chat.completions.create({
              model: "gpt-4o",
              messages: messages,
            });

            textoFinalParaEnviar = finalCompletion.choices[0].message.content || "PDF enviado correctamente.";

          } catch (error) {
            console.error("Error al despachar el PDF:", error);
            textoFinalParaEnviar = "❌ Lo siento, tuve un problema al generar el documento. Inténtalo de nuevo.";
          }
        }
      } else if (functionName === "calcular_altura_ubicacion") {
        const mapsUrl = args.url_google_maps;

        // ─── Guard: solo ejecutar si el mensaje ACTUAL contiene una URL de Maps ───
        const mensajeContieneUrl = /maps\.app\.goo\.gl|google\.com\/maps|maps\.google\.com/i.test(messageText);

        if (!mensajeContieneUrl) {
          textoFinalParaEnviar = `No encontré un enlace de Google Maps en tu mensaje. Por favor envíame el enlace directamente para calcular la altitud. 🗺️`;
        } else {
          await sendWhatsAppMessage(cleanNumber, "📍 *Procesando ubicación...* Calculando la altitud, dame un segundo.");

          try {
            // ─── User-Agent MÓVIL: con UA de escritorio Google a veces redirige a
            // una consent page sin coordenadas; con móvil va directo al mapa. ───
            const responseUrl = await fetch(mapsUrl, {
              redirect: 'follow',
              cache: 'no-store',
              headers: {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
                'Accept-Language': 'es-CR,es;q=0.9',
              }
            });

            const finalUrl = responseUrl.url;
            const htmlText = await responseUrl.text();

            let lat: string | null = null;
            let lng: string | null = null;

            // ─── Estrategia 1: Coordenadas directas en la URL expandida ───
            const urlPatterns = [
              /@(-?\d+\.\d+),(-?\d+\.\d+)/,
              /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/,
              /\/place\/[^/]+\/@(-?\d+\.\d+),(-?\d+\.\d+)/,
              /ll=(-?\d+\.\d+),(-?\d+\.\d+)/,
              /center=(-?\d+\.\d+)%2C(-?\d+\.\d+)/,
              /[?&]center=(-?\d+\.\d+),(-?\d+\.\d+)/,
            ];

            for (const pattern of urlPatterns) {
              const m = finalUrl.match(pattern);
              if (m) { lat = m[1]; lng = m[2]; break; }
            }

            // ─── Estrategia 2: Coordenadas en el HTML ───
            if (!lat || !lng) {
              const htmlPatterns = [
                /markers=(-?\d+\.\d+)%2C(-?\d+\.\d+)/,
                /markers=(-?\d+\.\d+),(-?\d+\.\d+)/,
                /q=(-?\d+\.\d+)%2C(-?\d+\.\d+)/,
                /\[null,null,(-?\d+\.\d+),(-?\d+\.\d+)\]/,
                /"lat":(-?\d+\.\d+),"lng":(-?\d+\.\d+)/,
                /\["",(-?\d+\.\d+),(-?\d+\.\d+)\]/,
                /\[\[(-?\d+\.\d+),(-?\d+\.\d+)\],null,null,null,null,\[/,
                /APP_INITIALIZATION_STATE=\[.*?(-?\d{1,3}\.\d{4,}),(-?\d{1,3}\.\d{4,})/,
              ];

              for (const pattern of htmlPatterns) {
                const m = htmlText.match(pattern);
                if (m) { lat = m[1]; lng = m[2]; break; }
              }
            }

            if (!lat || !lng) {
              throw new Error("No se pudieron extraer coordenadas del enlace.");
            }

            const apiKey = process.env.NEXT_PUBLIC_ELEVATION_API_KEY;
            const elevationResponse = await fetch(
              `https://maps.googleapis.com/maps/api/elevation/json?locations=${lat},${lng}&key=${apiKey}`,
              { cache: 'no-store' }
            );
            const elevationData = await elevationResponse.json();

            if (elevationData.status !== "OK" || !elevationData.results.length) {
              throw new Error(`Elevation API status: ${elevationData.status}`);
            }

            const altitud = Math.round(elevationData.results[0].elevation);

            messages.push(responseMessage);
            messages.push({
              tool_call_id: toolCall.id,
              role: "tool",
              name: toolCall.function.name,
              content: JSON.stringify({
                success: true,
                latitud: lat,
                longitud: lng,
                elevacion_metros: altitud,
              }),
            });

            const finalCompletion = await openai.chat.completions.create({
              model: "gpt-4o",
              messages: messages,
            });

            textoFinalParaEnviar = finalCompletion.choices[0].message.content || "He calculado la altura exitosamente.";

          } catch (error) {
            console.error("Error al calcular la altitud:", error);

            messages.push(responseMessage);
            messages.push({
              tool_call_id: toolCall.id,
              role: "tool",
              name: toolCall.function.name,
              content: JSON.stringify({
                success: false,
                error: "No se pudieron extraer coordenadas del enlace proporcionado.",
              }),
            });

            const finalCompletion = await openai.chat.completions.create({
              model: "gpt-4o",
              messages: messages,
            });

            textoFinalParaEnviar = finalCompletion.choices[0].message.content
              || "❌ No pude procesar ese enlace. Intenta compartirlo desde Google Maps tocando *Compartir → Copiar enlace*. Si sigue sin funcionar, el lugar podría no tener pin exacto.";
          }
        }
      }
    } else {
      textoFinalParaEnviar = responseMessage.content || `Hola ${primerNombre}, ¿en qué puedo ayudarte hoy?`;
    }

    const mencionaPropiedad = textoFinalParaEnviar.includes('🔗');
    const yaTieneFuente = textoFinalParaEnviar.includes('Fuente:');
    const textoConFuente = (mencionaPropiedad && !yaTieneFuente)
      ? `${textoFinalParaEnviar}\n\n*Fuente: Plataforma inmobiliaria de FlowEstateAI*`
      : textoFinalParaEnviar;

    const cleanFinalResponse = formatForWhatsApp(textoConFuente);
    
    await supabaseAdmin.from('chat_messages').insert({ agent_id: agent.id, role: 'assistant', content: cleanFinalResponse });
    await sendWhatsAppMessage(cleanNumber, cleanFinalResponse);
    
    return NextResponse.json({ success: true, status: 'replied_success' });

  } catch (error) {
    console.error('❌ Error crítico en el webhook:', error);
    return NextResponse.json({ success: true, error: 'Internal Server Error' });
  }
}