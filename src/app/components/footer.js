"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";

export default function Footer() {
  const { t } = useLanguage();
  return (
    <footer className="footer">
      {t("© 2026 cepret. All rights reserved")}
    </footer>
  );
}
