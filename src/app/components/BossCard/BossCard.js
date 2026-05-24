"use client";

import { useEffect, useState, useRef } from "react";
import styles from "./BossCard.module.css";
import bossVoice from "../../Helper/BossVoice";
function parseSpawnToDate(spawn) {
  if (!spawn) return null;
  if (spawn instanceof Date) return spawn;
  const iso = new Date(spawn);
  if (!isNaN(iso)) return iso;
  const hhmm = String(spawn).match(/^(\d{1,2}):(\d{2})$/);
  if (hhmm) {
    const now = new Date();
    const d = new Date(now);
    d.setHours(parseInt(hhmm[1], 10), parseInt(hhmm[2], 10), 0, 0);
    // Only bump to tomorrow if the time is actually a "tomorrow" time (>5min in the past).
    // If it's 0–5min past, it just expired → let remaining go negative.
    if (now.getTime() - d.getTime() > 5 * 60 * 1000) d.setDate(d.getDate() + 1);
    return d;
  }
  return null;
}

function formatCountdown(ms) {
  if (ms > 0) {
    const totalSec = Math.floor(ms / 1000);
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    const s = `${String(seconds).padStart(2, "0")}s`;
    const m = `${String(minutes).padStart(2, "0")}m`;
    if (hours > 0) return `${hours}h ${m} ${s}`;
    return `${minutes}m ${s}`;
  }
  // expired: count up negatively until BossContainer removes the card (~60s)
  return `-${Math.abs(Math.ceil(ms / 1000))}s`;
}

function getPointsInfo(boss) {
  if (boss.category === "ffa") return { points: 5, label: "ffa" };
  if (boss.category === "red") return { points: 3, label: "red" };
  return null;
}

export default function BossCard({ boss }) {
  const spawnDateRef = useRef(parseSpawnToDate(boss.spawn_time));

  const [now, setNow] = useState(() => Date.now());

  const played5Ref = useRef(false);
  const played1Ref = useRef(false);
  const playedNowRef = useRef(false);

  const target = spawnDateRef.current;
  const remaining = target ? target.getTime() - now : null;
  const timerText = remaining == null ? "—" : formatCountdown(remaining);

  const LATE_TOLERANCE_MS = 10000; // 10s max late
  const isVisible = typeof document === "undefined" ? true : !document.hidden;
  
  useEffect(() => {
    // update target if boss.spawn_time prop changes
    spawnDateRef.current = parseSpawnToDate(boss.spawn_time);
  }, [boss.spawn_time]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    bossVoice.init(); // safe client-only initialization
  }, []);

  useEffect(() => {
    if (remaining == null) return;
    if (remaining <= 5*60*1000 && !played5Ref.current && remaining > 1*60*1000) {
      played5Ref.current = true;
      bossVoice.speak(boss.name, 5);
    }
    if (remaining <= 1*60*1000 && !played1Ref.current && remaining > 0) {
      played1Ref.current = true;
      bossVoice.speak(boss.name, 1);
    }
    if (
      remaining <= 0 &&
      remaining > -LATE_TOLERANCE_MS &&
      !playedNowRef.current &&
      isVisible
      ) {
      playedNowRef.current = true;
      bossVoice.speak(boss.name, 0);
    }
  }, [remaining, boss.name]);

  function cardStyleForBossType() {
    if (boss.type === "invasion") {
      return styles.boss_invasion;
    } else if (boss.category === "ffa" || boss.name === "Queen Ant" || boss.name === "Core Susceptor") {
      return styles.boss_ffa;
    } else if (boss.category === "blue") {
      return styles.boss_blue;
    }
  }

  const pointsInfo = getPointsInfo(boss);

  return (
    <div className={`card-container ${cardStyleForBossType()}`} aria-live="polite">
      {boss.type === "invasion" && (
        <span className={styles.invasion_badge} title="Invasion">
          <img src="/invasion-icon.png" alt="Invasion" width={42} height={42} />
        </span>
      )}
     <div className="card-boss-name">{boss.name}</div>
      <div className="card-detail">
        Spawn: {boss.spawn_time ?? "—"} {boss.percentage != null ? `(${boss.percentage}%)` : ""}
      </div>
      <div className="card-timer">
        <svg className="timer-icon" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
         {timerText}
      </div>
      {boss.updated_by && (
        <div className="card-meta">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            aria-label="Updated by"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ display: "inline-block", verticalAlign: "middle", marginRight: "4px" }}
          >
            <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M4 20c0-4 3.582-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {boss.updated_by}
        </div>
      )}
      {pointsInfo && (
        <span className={`${styles.points_badge} ${styles[`pts_${pointsInfo.label}`]}`}>
          {pointsInfo.points} pts
        </span>
      )}
    </div>
  );
}