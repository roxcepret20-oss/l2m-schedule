"use client";

import { useEffect, useState, useRef } from "react";
import styles from "./EventCard.module.css";
import eventVoice from "../../Helper/EventVoice";

function parseSpawnToDate(spawn) {
  if (!spawn) return null;
  if (spawn instanceof Date) return spawn;
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

export default function EventCard({ event }) {
  const spawnDateRef = useRef(parseSpawnToDate(event.spawn_time));
  const [now, setNow] = useState(() => Date.now());
  const played5Ref = useRef(false);

  const FIVE_MIN_MS = 5 * 60 * 1000;
  const ALERT_WINDOW_MS = 10000;
  const isVisible = typeof document === "undefined" ? true : !document.hidden;

  useEffect(() => {
    spawnDateRef.current = parseSpawnToDate(event.spawn_time);
    played5Ref.current = false;
  }, [event.spawn_time]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    eventVoice.init();
  }, []);

  const target = spawnDateRef.current;
  const remaining = target ? target.getTime() - now : null;
  const timerText = remaining == null ? "—" : formatCountdown(remaining);

  useEffect(() => {
    if (remaining == null) return;
    if (
      remaining <= FIVE_MIN_MS &&
      remaining > FIVE_MIN_MS - ALERT_WINDOW_MS &&
      !played5Ref.current &&
      isVisible
    ) {
      played5Ref.current = true;
      eventVoice.speakPrepare(event.name);
    }
  }, [remaining, event.name, isVisible]);

  return (
    <div className={`card-container ${styles.event_card}`} aria-live="polite">
      <span className={styles.event_badge}>Event</span>
      <div className="card-boss-name">{event.name}</div>
      <div className="card-detail">Time: {event.spawn_time ?? "—"}</div>
      <div className="card-timer">
        <svg
          className="timer-icon"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 7v5l3 2"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle
            cx="12"
            cy="12"
            r="8"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {timerText}
      </div>
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
          pilo92
      </div>
    </div>
  );
}
