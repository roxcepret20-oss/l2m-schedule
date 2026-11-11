"use client";

import { formatCountdown, formatSpawnDisplay, getCountdownUrgency } from "@/lib/pipelineGrouping";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import styles from "./Pipeline.module.css";

function pointsBadgeClass(points) {
  if (points >= 50) return styles.pts_50;
  if (points === 10) return styles.pts_10;
  if (points >= 5) return styles.pts_5;
  if (points === 3) return styles.pts_3;
  if (points === 2) return styles.pts_2;
  return styles.pts_1;
}

export default function PipelineCard({ group, now, isNextUp }) {
  const { lang, t, bossName, eventName, units } = useLanguage();
  const startRemaining = group.start.getTime() - now;
  const badgeLabel = t(group.isSingle ? "SINGLE" : isNextUp ? "NEXT UP" : "CHAIN");
  const minutesLabel = lang === "th"
    ? `${group.spanMinutes} ${t("Minutes")}`
    : `${group.spanMinutes} Minute${group.spanMinutes === 1 ? "" : "s"}`;
  const title = group.isSingle
    ? t("Solo Spawn")
    : `${t("Boss Chain")} · ${minutesLabel}`;
  const spawnsLabel = (n) => `${n} ${t(n === 1 ? "spawn" : "spawns")}`;
  const subtitle = group.isSingle
    ? `${formatSpawnDisplay(group.start)} · ${spawnsLabel(1)}`
    : `${formatSpawnDisplay(group.start)} → ${formatSpawnDisplay(group.end)} · ${spawnsLabel(group.items.length)}`;

  return (
    <div className={`${styles.pipelineCard} ${isNextUp ? styles.nextUp : ""}`}>
      <div className={styles.pipelineHeader}>
        <div className={styles.pipelineTitleGroup}>
          <span className={`${styles.pipelineBadge} ${isNextUp ? styles.badgeNext : ""}`}>{badgeLabel}</span>
          <div>
            <div className={styles.pipelineTitle}>{title}</div>
            <div className={styles.pipelineSub}>{subtitle}</div>
          </div>
        </div>
        <div className={styles.pipelineMeta}>
          {t("Starts in")}
          <br />
          <b>{formatCountdown(startRemaining, units)}</b>
        </div>
      </div>
      <ul className={styles.timeline}>
        {group.items.map((item) => {
          const remaining = item.spawnDate.getTime() - now;
          const urgency = getCountdownUrgency(remaining);
          return (
            <li className={styles.timelineItem} key={item.id}>
              <div className={styles.dotWrap}>
                <div className={`${styles.dot} ${styles[`dot_${urgency}`]}`} />
              </div>
              <div className={styles.itemMain}>
                <div className={styles.itemName}>
                  {item._type === "event" ? eventName(item.name) : bossName(item.name)}
                  {item.tag && (
                    <span className={`${styles.tag} ${styles[`tag_${item.tag.toLowerCase()}`]}`}>{t(item.tag)}</span>
                  )}
                  {item.points && item.points.map((pts, i) => (
                    <span key={i} className={`${styles.ptsBadge} ${pointsBadgeClass(pts)}`}>{pts} {t("pts")}</span>
                  ))}
                </div>
                <div className={styles.itemTime}>{formatSpawnDisplay(item.spawnDate)}</div>
              </div>
              <div className={`${styles.countdown} ${styles[`countdown_${urgency}`]}`}>{formatCountdown(remaining, units)}</div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
