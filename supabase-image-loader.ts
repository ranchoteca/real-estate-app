export default function supabaseLoader({ src, width, quality }: { src: string, width: number, quality?: number }) {
  // Verificamos si la imagen viene de tu base de datos
  const isSupabase = src.includes('supabase.co/storage/v1/object/public/');
  
  if (isSupabase) {
    // Cambiamos la ruta para usar el motor de transformación de Supabase Pro
    const transformSrc = src.replace('/object/public/', '/render/image/public/');
    
    // Devolvemos la URL con los parámetros dinámicos que Next.js calculó
    return `${transformSrc}?width=${width}&quality=${quality || 75}`;
  }
  
  // Si es un placeholder o foto de Google, se devuelve normal
  return src;
}