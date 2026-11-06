import { useContext } from 'react';
import { LocaleContext } from './LocaleContext';

export const useI18n = () => {
  const state = useContext(LocaleContext);
  if (!state) {
    throw new Error('useI18n must be used inside LocaleProvider');
  }
  return state;
};
