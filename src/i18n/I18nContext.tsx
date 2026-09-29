import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import en from './locales/en.json';
import mr from './locales/mr.json';
import hi from './locales/hi.json';

export type Lang = 'en' | 'mr' | 'hi';

export const LANGS: { code: Lang; label: string; english: string }[] = [
  { code: 'mr', label: 'मराठी', english: 'Marathi' },
  { code: 'hi', label: 'हिंदी', english: 'Hindi' },
  { code: 'en', label: 'English', english: 'English' },
];

const DICT: Record<Lang, Record<string, string>> = {
  en: en as Record<string, string>,
  mr: mr as Record<string, string>,
  hi: hi as Record<string, string>,
};

// v2: Marathi became the default for everyone (earlier builds followed the
// browser language and saved it), so older saved choices are not reused.
const STORAGE_KEY = 'st-lang-v2';

function detectLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as Lang | null;
    if (saved && saved in DICT) return saved;
  } catch {
    /* ignore */
  }
  // Marathi is the default; English/Hindi only when the user picks them.
  return 'mr';
}

interface I18nValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  // Marathi from the first render (also what the prerendered HTML contains).
  const [lang, setLangState] = useState<Lang>('mr');

  // Restore an explicit earlier choice after mount.
  useEffect(() => {
    setLangState(detectLang());
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') document.documentElement.lang = lang;
  }, [lang]);

  // Persist only when the user actively picks a language, so the default
  // never gets written back as if it were a choice.
  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
  };

  const value = useMemo<I18nValue>(() => {
    const t = (key: string, params?: Record<string, string | number>) => {
      let s = DICT[lang][key] ?? DICT.en[key] ?? key;
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
        }
      }
      return s;
    };
    return { lang, setLang, t };
  }, [lang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}

/** Pick the best localised name for an entity given the current language. */
export function localName(
  lang: Lang,
  entity: { name: string; nameMr?: string; nameHi?: string },
): string {
  if (lang === 'mr') return entity.nameMr || entity.name;
  if (lang === 'hi') return entity.nameHi || entity.name;
  return entity.name;
}
