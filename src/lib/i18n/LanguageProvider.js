"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import {
  DEFAULT_LANG,
  LANG_STORAGE_KEY,
  LANGUAGES,
  getCountdownUnits,
  translate,
  translateBossName,
  translateEventName,
} from "./translations";

const LanguageContext = createContext(null);
const LANG_EVENT = "app-lang-change";

function subscribe(callback) {
  window.addEventListener(LANG_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(LANG_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function getSnapshot() {
  try {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    if (LANGUAGES.some((l) => l.value === saved)) return saved;
  } catch {}
  return DEFAULT_LANG;
}

// the server and the hydration pass render English, then the saved choice applies
const getServerSnapshot = () => DEFAULT_LANG;

export function LanguageProvider({ children }) {
  const lang = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next) => {
    try { localStorage.setItem(LANG_STORAGE_KEY, next); } catch {}
    window.dispatchEvent(new Event(LANG_EVENT));
  }, []);

  const value = useMemo(() => ({
    lang,
    setLang,
    t: (key) => translate(lang, key),
    bossName: (name) => translateBossName(lang, name),
    eventName: (name) => translateEventName(lang, name),
    units: getCountdownUnits(lang),
  }), [lang, setLang]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

const FALLBACK = {
  lang: DEFAULT_LANG,
  setLang: () => {},
  t: (key) => key,
  bossName: (name) => name,
  eventName: (name) => name,
  units: getCountdownUnits(DEFAULT_LANG),
};

export function useLanguage() {
  return useContext(LanguageContext) || FALLBACK;
}
