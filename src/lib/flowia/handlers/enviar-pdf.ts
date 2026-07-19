import { supabaseAdmin } from '@/lib/supabase';
import { sendWhatsAppMessage } from '@/lib/api/wasender';
import { BASE_DOMAIN, delay } from '../constants';

interface EnviarPdfArgs {
  slug?: string;
}

export async function handleEnviarPdf(
  agentId: string,
  cleanNumber: string,
  args: EnviarPdfArgs
): Promise<{ toolResult: object; textoFinal: string }> {
  let slug = args.slug;

  // Si el LLM no pudo extraer el slug, intentamos con la última propiedad mostrada
  if (!slug) {
    const { data: ultimaMostrada } = await supabaseAdmin
      .from('agent_last_property_shown')
      .select('slug')
      .eq('agent_id', agentId)
      .maybeSingle();

    slug = ultimaMostrada?.slug;
  }

  if (!slug) {
    return {
      toolResult: { success: false, error: 'No se pudo identificar la propiedad.' },
      textoFinal: 'No logré identificar con certeza qué propiedad quieres en PDF. ¿Puedes confirmarme el nombre o la ubicación?',
    };
  }

  try {
    await sendWhatsAppMessage(cleanNumber, '⏳ *Generando el PDF de la propiedad...* Dame un momento por favor.');
    await delay(1200);

    const pdfUrl = `${BASE_DOMAIN}/api/pdf-generator?slug=${slug}&agent_id=${agentId}&t=${Date.now()}`;

    await sendWhatsAppMessage(
      cleanNumber,
      '📄 Aquí tienes el documento detallado de la propiedad.',
      pdfUrl,
      `Ficha-${slug}.pdf`
    );

    await delay(1200);

    return {
      toolResult: { success: true, message: 'PDF generado y enviado exitosamente.' },
      textoFinal: 'PDF enviado correctamente. 📄 Si necesitas algo más, aquí estoy para ayudarte.',
    };
  } catch (error) {
    console.error('Error al despachar el PDF:', error);
    return {
      toolResult: { success: false, error: 'Error generando el PDF.' },
      textoFinal: '❌ Lo siento, tuve un problema al generar el documento. Inténtalo de nuevo.',
    };
  }
}