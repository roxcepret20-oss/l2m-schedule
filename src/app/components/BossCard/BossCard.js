"use client";

import { useEffect, useState, useRef } from "react";
import styles from "./BossCard.module.css";
import bossVoice from "../../Helper/BossVoice";
import { MULTI_CLAN_MODE, CLAN_PRIMARY, CLAN_SECONDARY } from "../../../lib/featureFlags";
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

function formatSpawnDisplay(spawn) {
  const d = parseSpawnToDate(spawn);
  if (!d) return spawn ?? "—";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function getPointsInfo(boss, ffaMode = "NORMAL", spawnDate = null, tzOffset = 0) {
  const cat = boss.category;
  if (cat !== "ffa" && cat !== "red") return null;

  const baseDate = spawnDate ?? new Date();
  const wibMs = baseDate.getTime()
    + (7 * 60 + baseDate.getTimezoneOffset()) * 60 * 1000
    - tzOffset * 60 * 60 * 1000;
  const wibDate = new Date(wibMs);
  const day = wibDate.getDay();
  const hour = wibDate.getHours();

  // Monday/Wednesday/Friday 08:00-24:00 => 3 points, except in PEACE mode.
  if (ffaMode !== "PEACE" && [1, 3, 5].includes(day) && hour >= 8) {
    return { points: 3, label: cat };
  }

  if (ffaMode === "WAR") {
    return { points: hour < 8 ? 2 : 3, label: cat };
  }

  // NORMAL and PEACE share the same time-based points.
  return { points: hour < 6 ? 2 : 1, label: cat };
}

function getClanType(spawnDate, tzOffset = 0, category, name, ffaMode = "NORMAL") {
  if (ffaMode === "WAR") return "both";
  if (category === "ffa") return "both";
  if (!spawnDate) return "both";

  const wibMs = spawnDate.getTime()
    + (7 * 60 + spawnDate.getTimezoneOffset()) * 60 * 1000
    - tzOffset * 60 * 60 * 1000;
  const wibDate = new Date(wibMs);
  const day = wibDate.getDay();
  const hour = wibDate.getHours();

  if (ffaMode === "NORMAL" && [1, 3, 5].includes(day) && hour >= 8) return "both";
  if (hour < 12) return CLAN_PRIMARY;
  return CLAN_SECONDARY;
}

export default function BossCard({ boss, tzOffset = 0, ffaMode = "NORMAL" }) {
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
    } else if (boss.category === "ffa") {
      return styles.boss_ffa;
    } else if (boss.category === "blue") {
      return styles.boss_blue;
    }
  }

  const pointsInfo = getPointsInfo(boss, ffaMode, spawnDateRef.current, tzOffset);

  return (
    <div className={`card-container ${cardStyleForBossType()}`} aria-live="polite">
      {boss.type === "invasion" && (
        <span className={styles.invasion_badge} title="Invasion">
          <img src="/invasion-icon.png" alt="Invasion" width={42} height={42} />
        </span>
      )}
      {boss.type !== "invasion" && (() => {
        const clan = MULTI_CLAN_MODE
          ? getClanType(spawnDateRef.current, tzOffset, boss.category, boss.name, ffaMode)
          : CLAN_PRIMARY;
        return (
          <span className={styles.world_badge}>
            {clan === "both" && (
              <>
                <img src="/scourge_icon.png" alt="Scourge" width={36} height={36} className={styles.icon_scourge} />
                <img src="/sentinel_icon.png" alt="Sentinel" width={36} height={36} className={styles.icon_sentinel} />
              </>
            )}
            {clan === CLAN_SECONDARY && (
              <img src="/scourge_icon.png" alt="Scourge" width={36} height={36} className={styles.icon_scourge} />
            )}
            {clan === CLAN_PRIMARY && (
              <img src="/sentinel_icon.png" alt="Sentinel" width={36} height={36} className={styles.icon_sentinel} />
            )}
          </span>
        );
      })()}
     <div className="card-boss-name">{boss.name}</div>
      <div className="card-detail">
        Spawn: {formatSpawnDisplay(boss.spawn_time)} {boss.percentage != null ? `(${boss.percentage}%)` : ""}
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
        <span className={`${styles.points_badge} ${styles[`pts_${pointsInfo.points}`]}`}>
          {pointsInfo.points} pts
        </span>
      )}
    </div>
  );
}