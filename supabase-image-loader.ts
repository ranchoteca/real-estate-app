export default function supabaseLoader({ src, width, quality }: { src: string, width: number, quality?: number }) {
  const isSupabase = src.includes('supabase.co/storage/v1/object/public/');
  
  if (isSupabase) {
    const transformSrc = src.replace('/object/public/', '/render/image/public/');
    
    // TRUCO: En lugar de usar el 'width' dinámico de Next.js que genera múltiples 
    // versiones de la misma foto, forzamos un ancho estándar de 800px.
    // Esto asegura que Supabase solo transforme la imagen UNA vez, ahorrando tu cuota.
    const fixedWidth = 800; 
    
    return `${transformSrc}?width=${fixedWidth}&quality=${quality || 75}&resize=contain`;
  }
  
  return src;
}