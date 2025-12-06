import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Language = 'es' | 'en';

interface I18nStore {
  language: Language;
  setLanguage: (lang: Language) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export const useI18nStore = create<I18nStore>()(
  persist(
    (set) => ({
      language: 'es', // Default Spanish
      isLoading: false,
      setLanguage: (lang) => set({ language: lang }),
      setIsLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: 'properta-language', // LocalStorage key
    }
  )
);

// Utility to detect browser language
export const detectBrowserLanguage = (): Language => {
  if (typeof window === 'undefined') return 'es';
  
  const browserLang = navigator.language.split('-')[0];
  return browserLang === 'en' ? 'en' : 'es';
};