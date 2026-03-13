"use client";

import { useEffect, useState, useRef } from "react";
import styles from "./BossCard.module.css";
import { ffaBossList, blueBossList } from "../../Helper/BossVariables";
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
    if (d <= now) d.setDate(d.getDate() + 1);
    return d;
  }
  return null;
}

function offsetSpawnTime(spawn_time, offset) {
  if (!spawn_time || !offset) return spawn_time;
  const match = String(spawn_time).match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return spawn_time;
  let hh = parseInt(match[1], 10) + offset;
  const mm = parseInt(match[2], 10);
  hh = ((hh % 24) + 24) % 24;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function formatCountdown(ms) {
  if (ms <= 0) return "0s";
  const totalSec = Math.floor(ms / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  const s = `${String(seconds).padStart(2, "0")}s`;
  const m = `${String(minutes).padStart(2, "0")}m`;
  if (hours > 0) return `${hours}h ${m} ${s}`;
  return `${minutes}m ${s}`;
}

export default function BossCard({ boss, tzOffset = 0 }) {
  const spawnDateRef = useRef(parseSpawnToDate(boss.spawn_time));

  const [now, setNow] = useState(() => Date.now());

  const played5Ref = useRef(false);
  const played1Ref = useRef(false);
  const playedNowRef = useRef(false);

  const target = spawnDateRef.current;
  const remaining = target ? target.getTime() - now : null;
  const timerText = remaining == null ? "—" : formatCountdown(remaining);
  
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
    if (remaining <= 0 && !playedNowRef.current) {
      playedNowRef.current = true;
      bossVoice.speak(boss.name, 0);
    }
  }, [remaining, boss.name]);

  function cardStyleForBossType() {
    if (boss.type === "invasion") {
      return styles.boss_invasion;
    } else if (ffaBossList.includes(boss.name)) {
      return styles.boss_ffa;
    } else if (blueBossList.includes(boss.name)) {
      return styles.boss_blue;
    }
  }

  return (
    <div className={`card-container ${cardStyleForBossType()}`} aria-live="polite">
     <div className="card-boss-name">{boss.name}</div>
      <div className="card-detail">
        Spawn: {offsetSpawnTime(boss.spawn_time, tzOffset)} {boss.percentage != null ? `(${boss.percentage}%)` : ""}
      </div>
      <div className="card-timer">
        <svg className="timer-icon" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
         {timerText}
      </div>
    </div>
  );
}