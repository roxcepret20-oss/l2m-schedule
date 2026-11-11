"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { LANGUAGES } from "@/lib/i18n/translations";

export default function LanguageSelect({ id = "lang-select" }) {
  const { lang, setLang, t } = useLanguage();
  return (
    <div className="tz-bar">
      <label className="tz-label" htmlFor={id}>{t("Language")}</label>
      <select
        id={id}
        className="tz-select"
        value={lang}
        onChange={(e) => setLang(e.target.value)}
      >
        {LANGUAGES.map((l) => (
          <option key={l.value} value={l.value}>{l.label}</option>
        ))}
      </select>
    </div>
  );
}
