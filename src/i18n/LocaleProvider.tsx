import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { en } from './en';
import { fr } from './fr';
import { LocaleContext } from './LocaleContext';
import type { Locale, Messages } from './types';

const STORAGE_KEY = 'sshelf.locale';

const MESSAGES: Record<Locale, Messages> = { fr, en };

const isLocale = (value: string | null): value is Locale => value === 'fr' || value === 'en';

const readStoredLocale = () => {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

const storeLocale = (locale: Locale) => {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    return;
  }
};

const systemLocale = (): Locale => (navigator.language.toLowerCase().startsWith('fr') ? 'fr' : 'en');

const initialLocale = (): Locale => {
  const stored = readStoredLocale();
  return isLocale(stored) ? stored : systemLocale();
};

type LocaleProviderProps = {
  children: ReactNode;
};

export const LocaleProvider = ({ children }: LocaleProviderProps) => {
  const [locale, setLocale] = useState<Locale>(initialLocale);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo(
    () => ({
      locale,
      messages: MESSAGES[locale],
      setLocale: (next: Locale) => {
        storeLocale(next);
        setLocale(next);
      },
    }),
    [locale],
  );

  return <LocaleContext value={value}>{children}</LocaleContext>;
};
