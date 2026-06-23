"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

type Locale = "ar" | "en";

function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[2]) : undefined;
}

function setCookie(name: string, value: string, days: number) {
  const d = new Date();
  d.setTime(d.getTime() + days * 864e5);
  document.cookie = `${name}=${encodeURIComponent(value)};path=/;expires=${d.toUTCString()}`;
}

const LanguageContext = createContext<{
  locale: Locale;
  setLocale: (l: Locale) => void;
}>({ locale: "ar", setLocale: () => {} });

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleInner] = useState<Locale>("ar");

  useEffect(() => {
    const stored = getCookie("locale");
    if (stored === "en" || stored === "ar") {
      setLocaleInner(stored);
    }
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleInner(l);
    setCookie("locale", l, 365);
    document.documentElement.lang = l;
    document.documentElement.dir = l === "ar" ? "rtl" : "ltr";
  }, []);

  return (
    <LanguageContext.Provider value={{ locale, setLocale }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLocale() {
  return useContext(LanguageContext);
}
