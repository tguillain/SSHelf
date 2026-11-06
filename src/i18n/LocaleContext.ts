import { createContext } from 'react';
import type { Locale, Messages } from './types';

export type LocaleState = {
  locale: Locale;
  messages: Messages;
  setLocale: (locale: Locale) => void;
};

export const LocaleContext = createContext<LocaleState | null>(null);
