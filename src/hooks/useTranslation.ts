import { useI18nStore } from '@/lib/i18n-store';
import es from '@/locales/es.json';
import en from '@/locales/en.json';

const translations = {
  es,
  en,
};

export function useTranslation() {
  const { language } = useI18nStore();

  // Helper function to get nested translation
  const t = (key: string): string => {
    const keys = key.split('.');
    let value: any = translations[language];

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        // Fallback to Spanish if key not found
        let fallback: any = translations.es;
        for (const fk of keys) {
          if (fallback && typeof fallback === 'object' && fk in fallback) {
            fallback = fallback[fk];
          } else {
            return key; // Return key if not found
          }
        }
        return fallback;
      }
    }

    return typeof value === 'string' ? value : key;
  };

  return { t, language };
}