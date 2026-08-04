"use client";

import { useEffect, useState, useRef } from "react";
import styles from "./NokaBossCard.module.css";
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
  return `-${Math.abs(Math.ceil(ms / 1000))}s`;
}

function formatSpawnDisplay(spawn) {
  const d = parseSpawnToDate(spawn);
  if (!d) return spawn ?? "—";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
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

function getPointsInfo(boss, ffaMode = "NORMAL", spawnDate = null, tzOffset = 0) {
  const cat = boss.category;
  if (cat !== "ffa" && cat !== "red") return null;

  if (ffaMode === "WAR") {
    return { points: 5, label: cat };
  }

  if (ffaMode === "PEACE") {
    return cat === "ffa" ? { points: 3, label: "ffa" } : { points: 1, label: "red" };
  }

  if (spawnDate) {
    const wibMs = spawnDate.getTime()
      + (7 * 60 + spawnDate.getTimezoneOffset()) * 60 * 1000
      - tzOffset * 60 * 60 * 1000;
    const wibDate = new Date(wibMs);
    const day = wibDate.getDay();
    const hour = wibDate.getHours();
    if ([1, 3, 5].includes(day) && hour >= 8) {
      return { points: 5, label: cat };
    }
  }

  return cat === "ffa" ? { points: 3, label: "ffa" } : { points: 1, label: "red" };
}

export default function NokaBossCard({ boss, tzOffset = 0, ffaMode = "NORMAL" }) {
  const spawnDateRef = useRef(parseSpawnToDate(boss.spawn_time));
  const [now, setNow] = useState(() => Date.now());

  const played5Ref = useRef(false);
  const played1Ref = useRef(false);
  const playedNowRef = useRef(false);

  const target = spawnDateRef.current;
  const remaining = target ? target.getTime() - now : null;
  const timerText = remaining == null ? "—" : formatCountdown(remaining);

  const LATE_TOLERANCE_MS = 10000;
  const isVisible = typeof document === "undefined" ? true : !document.hidden;
  
  useEffect(() => {
    spawnDateRef.current = parseSpawnToDate(boss.spawn_time);
  }, [boss.spawn_time]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    bossVoice.init();
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

  function getBackgroundImage() {
    if (boss.category === "ffa") {
      return "url('/noka_theme/ffa.png')";
    }
    if (MULTI_CLAN_MODE) {
      const clan = getClanType(spawnDateRef.current, tzOffset, boss.category, boss.name, ffaMode);
      if (clan === CLAN_SECONDARY) return "url('/noka_theme/Scourge_bar.png')";
    }
    return "url('/noka_theme/Sentinel_bar.png')";
  }

  const pointsInfo = getPointsInfo(boss, ffaMode, spawnDateRef.current, tzOffset);

  return (
    <div 
      className={styles.noka_card_container}
      style={{ backgroundImage: getBackgroundImage() }}
      aria-live="polite"
    >
      <div className={styles.noka_content}>
        <div className={styles.noka_boss_name}>{boss.name}</div>
        <div className={styles.noka_detail}>
          Spawn: {formatSpawnDisplay(boss.spawn_time)} {boss.percentage != null ? `(${boss.percentage}%)` : ""}
        </div>
        <div className={styles.noka_timer}>
          <svg className={styles.timer_icon} width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {timerText}
        </div>
        {boss.updated_by && (
          <div className={styles.noka_meta}>
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
          <span className={`${styles.noka_points_badge} ${styles[`pts_${pointsInfo.points}`]}`}>
            {pointsInfo.points} pts
          </span>
        )}
      </div>
    </div>
  );
}
