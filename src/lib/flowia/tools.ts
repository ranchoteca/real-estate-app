export const FLOWIA_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'buscar_propiedades',
      description: 'Busca propiedades aplicando filtros de texto, tipo de negocio y presupuestos exactos.',
      parameters: {
        type: 'object',
        properties: {
          termino_busqueda: { type: 'string' },
          precio_min: { type: 'number' },
          precio_max: { type: 'number' },
          moneda_referencia: { type: 'string', enum: ['CRC', 'USD'] },
          tipo_transaccion: { type: 'string', enum: ['venta', 'alquiler'] },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'enviar_pdf_propiedad',
      description:
        "Úsalo ÚNICAMENTE cuando el agente pide un PDF. DEBES extraer el 'slug' exacto de la propiedad del contexto y enviarlo en los parámetros.",
      parameters: {
        type: 'object',
        properties: {
          slug: { type: 'string', description: 'El slug exacto de la propiedad solicitada.' },
        },
        required: ['slug'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'calcular_altura_ubicacion',
      description:
        'Calcula la altitud (elevación) en metros sobre el nivel del mar a partir de un enlace de Google Maps compartido por el usuario.',
      parameters: {
        type: 'object',
        properties: {
          url_google_maps: {
            type: 'string',
            description:
              'El enlace de Google Maps extraído del mensaje del usuario (ej. https://maps.app.goo.gl/... o https://www.google.com/maps/...).',
          },
        },
        required: ['url_google_maps'],
      },
    },
  },
] as const;