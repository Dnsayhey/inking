import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en";
import zhCN from "./locales/zh-CN";

const STORAGE_KEY = "inking.locale";

export type LanguagePreference = "system" | "zh-CN" | "en";

export function detectSystemLanguage(): "zh-CN" | "en" {
  const browserLang = navigator.language.toLowerCase();
  return browserLang.startsWith("zh") ? "zh-CN" : "en";
}

export function getLanguagePreference(): LanguagePreference {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "system" || stored === "zh-CN" || stored === "en") {
    return stored;
  }
  return "system";
}

export function resolveLanguage(preference: LanguagePreference): "zh-CN" | "en" {
  return preference === "system" ? detectSystemLanguage() : preference;
}

export async function applyLanguagePreference(preference: LanguagePreference) {
  localStorage.setItem(STORAGE_KEY, preference);
  await i18n.changeLanguage(resolveLanguage(preference));
}

void i18n.use(initReactI18next).init({
  resources: {
    "zh-CN": { translation: zhCN },
    en: { translation: en },
  },
  lng: resolveLanguage(getLanguagePreference()),
  fallbackLng: "zh-CN",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
