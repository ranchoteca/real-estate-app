export const BASE_DOMAIN = 'https://www.flowestateai.com';
export const PROPERTY_PATH = '/p/';

export const CURRENCY_MAP: Record<string, { code: string; symbol: string }> = {
  'ec8528a3-d504-47fa-97db-2c07716d8b47': { code: 'CRC', symbol: '₡' },
  '839f44d5-bee2-4bc1-b5da-50364f14c681': { code: 'USD', symbol: '$' },
};

// Estado de sesión del agente
export const AGENT_MODE = {
  NORMAL: null,
  CREAR_PROPIEDAD: 'CREAR_PROPIEDAD',
} as const;

export type AgentMode = typeof AGENT_MODE[keyof typeof AGENT_MODE];

// Límites de fotos por propiedad
export const PHOTO_MIN = 2;
export const PHOTO_MAX = 15;

// Delay helper
export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));