"use client";

import styles from "./dashboard.module.css";

export default function DashboardPage() {
  return (
    <div>
      <h1 className={styles.pageTitle}>Welcome back</h1>
      <p className={styles.pageSubtitle}>Here&apos;s an overview of your clan management tools.</p>
      <div className={styles.cardGrid}>
        {[
          { label: "Attendance", value: "—", desc: "Today's records" },
          { label: "Members", value: "—", desc: "Active members" },
          { label: "Bosses", value: "—", desc: "Tracked bosses" },
          { label: "Clan", value: "—", desc: "Clan info" },
        ].map((card) => (
          <div key={card.label} className={styles.statCard}>
            <div className={styles.statLabel}>{card.label}</div>
            <div className={styles.statValue}>{card.value}</div>
            <div className={styles.statDesc}>{card.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
