"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import styles from "../dashboard/dashboard.module.css";

const MENU_ITEMS = [
  { href: "/attendance/dashboard", label: "Dashboard", icon: "grid" },
  { href: "/attendance/dashboard/attendance", label: "Attendance", icon: "clipboard" },
  { href: "/attendance/clans", label: "Clan", icon: "shield" },
  { href: "/attendance/members", label: "Members", icon: "users" },
  { href: "/attendance/dashboard/bosses", label: "Bosses", icon: "skull" },
];

const SETTINGS_SUB_ITEMS = [
  { href: "/attendance/settings/gear_score_formula", label: "Gear Score Formula" },
  { href: "/attendance/settings/admins", label: "Admins" },
];

const ICONS = {
  grid: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  clipboard: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" />
    </svg>
  ),
  shield: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  users: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  ),
  skull: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="10" r="8" /><path d="M8 16v4h2v-2h4v2h2v-4" /><circle cx="9" cy="10" r="1.5" fill="currentColor" /><circle cx="15" cy="10" r="1.5" fill="currentColor" />
    </svg>
  ),
  gear: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  ),
  chevron: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
};

export function Sidebar() {
  const pathname = usePathname() || "/attendance/dashboard";
  const isUnderSettings = pathname.startsWith("/attendance/settings");
  const [flyoutOpen, setFlyoutOpen] = useState(false);

  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarLogo}>
        <span className={styles.logoIcon}>S</span>
        <span className={styles.logoText}>Shatter</span>
      </div>
      <nav className={styles.sidebarNav}>
        {MENU_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.navItem} ${pathname === item.href ? styles.navItemActive : ""}`}
          >
            <span className={styles.navIcon}>{ICONS[item.icon]}</span>
            <span className={styles.navLabel}>{item.label}</span>
          </Link>
        ))}

        {/* Settings group — click to toggle */}
        <div className={styles.navGroup}>
          <button
            className={`${styles.navItem} ${styles.navGroupBtn} ${isUnderSettings ? styles.navItemActive : ""}`}
            onClick={() => setFlyoutOpen((v) => !v)}
          >
            <span className={styles.navIcon}>{ICONS.gear}</span>
            <span className={styles.navLabel}>Settings</span>
            <span className={`${styles.navChevron} ${flyoutOpen ? styles.navChevronOpen : ""}`}>
              {ICONS.chevron}
            </span>
          </button>

          {flyoutOpen && (
            <div className={styles.navFlyout}>
              <p className={styles.navFlyoutTitle}>Settings</p>
              {SETTINGS_SUB_ITEMS.map((sub) => (
                <Link
                  key={sub.href}
                  href={sub.href}
                  className={`${styles.navFlyoutItem} ${pathname === sub.href ? styles.navFlyoutItemActive : ""}`}
                >
                  {sub.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </nav>
    </aside>
  );
}
