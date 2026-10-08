"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import styles from "../dashboard/dashboard.module.css";

const COLLAPSED_KEY = "attendance_sidebar_collapsed";

const MENU_ITEMS = [
  { href: "/attendance/dashboard", label: "Dashboard", icon: "grid" },
  { href: "/attendance/clans", label: "Clan", icon: "shield" },
  { href: "/attendance/members", label: "Members", icon: "users" },
  { href: "/attendance/attendances", label: "Attendances", icon: "check", matchPrefix: true },
  { href: "/attendance/loans", label: "Loans", icon: "coin", matchPrefix: true },
];

const SETTINGS_SUB_ITEMS = [
  { href: "/attendance/settings/gear_score_formula", label: "Gear Score Formula" },
  { href: "/attendance/settings/attendance", label: "Attendance Settings" },
  { href: "/attendance/settings/tax", label: "Tax Settings" },
  { href: "/attendance/settings/admins", label: "Admins" },
  { href: "/attendance/settings/users", label: "Users" },
];

const ICONS = {
  grid: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
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
  check: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /><path d="M9 16l2 2 4-4" />
    </svg>
  ),
  gear: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  ),
  coin: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" /><path d="M14.5 9.5c-.6-.8-1.5-1.2-2.5-1.2-1.4 0-2.5.8-2.5 1.9 0 2.6 5 1.4 5 3.9 0 1.1-1.1 1.9-2.5 1.9-1.1 0-2-.5-2.6-1.3" /><path d="M12 6.5v1.8M12 15.7v1.8" />
    </svg>
  ),
  collapse: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="11 17 6 12 11 7" /><polyline points="18 17 13 12 18 7" />
    </svg>
  ),
  expand: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="13 17 18 12 13 7" /><polyline points="6 17 11 12 6 7" />
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
  // The sidebar only renders after the auth check on the client, so reading localStorage here is hydration-safe.
  const [collapsed, setCollapsed] = useState(
    () => typeof window !== "undefined" && localStorage.getItem(COLLAPSED_KEY) === "1"
  );

  function toggleCollapsed() {
    setCollapsed((prev) => {
      localStorage.setItem(COLLAPSED_KEY, prev ? "0" : "1");
      return !prev;
    });
  }

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.sidebarCollapsed : ""}`}>
      <div className={styles.sidebarLogo}>
        <span className={styles.logoIcon}>S</span>
        <span className={styles.logoText}>Shatter</span>
        <button
          type="button"
          className={styles.collapseBtn}
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? ICONS.expand : ICONS.collapse}
        </button>
      </div>
      <nav className={styles.sidebarNav}>
        {MENU_ITEMS.map((item) => {
          const active = item.matchPrefix ? pathname.startsWith(item.href) : pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`${styles.navItem} ${active ? styles.navItemActive : ""}`}
            >
              <span className={styles.navIcon}>{ICONS[item.icon]}</span>
              <span className={styles.navLabel}>{item.label}</span>
            </Link>
          );
        })}

        {/* Settings group — click to toggle */}
        <div className={styles.navGroup}>
          <button
            className={`${styles.navItem} ${styles.navGroupBtn} ${isUnderSettings ? styles.navItemActive : ""}`}
            onClick={() => setFlyoutOpen((v) => !v)}
            title={collapsed ? "Settings" : undefined}
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
