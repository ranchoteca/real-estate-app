'use server';

export async function fetchElevationFromServer(lat: number, lng: number) {
  // Leemos la variable de entorno de forma segura en el servidor
  const apiKey = process.env.NEXT_PUBLIC_ELEVATION_API_KEY;

  if (!apiKey) {
    console.error("Falta la API Key de elevación en el servidor.");
    return { success: false, error: 'API Key no configurada' };
  }

  // Construimos la URL de la API REST de Google
  const url = `https://maps.googleapis.com/maps/api/elevation/json?locations=${lat},${lng}&key=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      // Retornamos la altitud redondeada
      return { success: true, elevation: Math.round(data.results[0].elevation) };
    } else {
      console.error("Error de Google Elevation API:", data.status, data.error_message);
      return { success: false, error: data.error_message || data.status };
    }
  } catch (error) {
    console.error("Error de red llamando a Google:", error);
    return { success: false, error: 'Error de conexión con Google' };
  }
}