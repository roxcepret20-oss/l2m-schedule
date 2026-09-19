"use client";

import { formatCountdown, formatSpawnDisplay, getCountdownUrgency } from "@/lib/pipelineGrouping";
import styles from "./Pipeline.module.css";

function pointsBadgeClass(points) {
  if (points >= 50) return styles.pts_50;
  if (points >= 5) return styles.pts_5;
  if (points === 3) return styles.pts_3;
  if (points === 2) return styles.pts_2;
  return styles.pts_1;
}

export default function PipelineCard({ group, now, isNextUp }) {
  const startRemaining = group.start.getTime() - now;
  const badgeLabel = group.isSingle ? "SINGLE" : isNextUp ? "NEXT UP" : "CHAIN";
  const title = group.isSingle
    ? "Solo Spawn"
    : `Boss Chain · ${group.spanMinutes} Minute${group.spanMinutes === 1 ? "" : "s"}`;
  const subtitle = group.isSingle
    ? `${formatSpawnDisplay(group.start)} · 1 spawn`
    : `${formatSpawnDisplay(group.start)} → ${formatSpawnDisplay(group.end)} · ${group.items.length} spawns`;

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
          Starts in
          <br />
          <b>{formatCountdown(startRemaining)}</b>
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
                  {item.name}
                  {item.tag && (
                    <span className={`${styles.tag} ${styles[`tag_${item.tag.toLowerCase()}`]}`}>{item.tag}</span>
                  )}
                  {item.points && item.points.map((pts, i) => (
                    <span key={i} className={`${styles.ptsBadge} ${pointsBadgeClass(pts)}`}>{pts} pts</span>
                  ))}
                </div>
                <div className={styles.itemTime}>{formatSpawnDisplay(item.spawnDate)}</div>
              </div>
              <div className={`${styles.countdown} ${styles[`countdown_${urgency}`]}`}>{formatCountdown(remaining)}</div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
