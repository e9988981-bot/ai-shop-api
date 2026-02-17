'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { Locale } from '@ai-shop/shared';

const STORAGE_KEY = 'ai_shop_locale';

const LocaleContext = createContext<{
  locale: Locale;
  setLocale: (l: Locale) => void;
}>({ locale: 'en', setLocale: () => {} });

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (stored === 'lo' || stored === 'en') setLocaleState(stored);
    }
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, l);
  }, []);

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}
