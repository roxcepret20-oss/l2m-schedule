"use client";

import { useEffect, useState, useRef } from "react";

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

export default function BossCard({ boss }) {
  const spawnDateRef = useRef(parseSpawnToDate(boss.spawn));
  const [now, setNow] = useState(() => Date.now());

  const [isSliding, setIsSliding] = useState(false);
  const [isGone, setIsGone] = useState(false);
  const slideTimeoutRef = useRef(null);
  const removeTimeoutRef = useRef(null);
  useEffect(() => {
    // update target if boss.spawn prop changes
    spawnDateRef.current = parseSpawnToDate(boss.spawn);
  }, [boss.spawn]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const target = spawnDateRef.current;
  const remaining = target ? target.getTime() - now : null;
  const timerText = remaining == null ? "—" : formatCountdown(remaining);
  const spawnTimeLabel = target
    ? target.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "Unknown";

   // schedule slide-out 60s after countdown reaches zero
  useEffect(() => {
    const SLIDE_TRIGGER_MS = 0 * 60 * 1000; // 10 minutes in ms
    // clear previous timers if spawn changed / moved into future
    function clearTimers() {
      if (slideTimeoutRef.current) {
        clearTimeout(slideTimeoutRef.current);
        slideTimeoutRef.current = null;
      }
      if (removeTimeoutRef.current) {
        clearTimeout(removeTimeoutRef.current);
        removeTimeoutRef.current = null;
      }
    }

    if (remaining != null && remaining <= SLIDE_TRIGGER_MS) {
      // already scheduled or sliding? do nothing
      if (!slideTimeoutRef.current && !isSliding && !isGone) {
        slideTimeoutRef.current = setTimeout(() => {
          setIsSliding(true);
          // remove element after animation (match css transition ~450ms)
          removeTimeoutRef.current = setTimeout(() => {
            setIsGone(true);
          }, 500);
        }, 60 * 1000); // 1 minute after hit zero
      }
    } else {
      // countdown moved into future or target missing -> cancel slide/removal
      clearTimers();
      setIsSliding(false);
      setIsGone(false);
    }

    return () => clearTimers();
  }, [remaining, isSliding, isGone, boss.spawn]);

  if (isGone) return null;

  return (
    <div className={`card-container${isSliding ? " slide-out" : ""}`} aria-live="polite">
     <div className="card-boss-name">{boss.name}</div>
      <div className="card-detail">Spawn: {boss.spawn.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
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