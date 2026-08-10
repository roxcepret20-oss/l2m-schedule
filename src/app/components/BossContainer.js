"use client";

import { useEffect, useState } from "react";
import BossCard from "./BossCard/BossCard";
import NokaBossCard from "./BossCard/NokaBossCard";
import EventCard from "./EventCard/EventCard";
import NokaEventCard from "./EventCard/NokaEventCard";
import { motion, AnimatePresence } from "framer-motion";

function computeSpawnTime(kill_time, interval, tzOffset = 0) {
  if (!kill_time) return null;
  const now = new Date();
  const hhmm = String(kill_time).match(/^(\d{1,2}):(\d{2})$/);
  let d = null;
  if (hhmm) {
    d = new Date(now);
    d.setHours(parseInt(hhmm[1], 10), parseInt(hhmm[2], 10), 0, 0);
  } else {
    const parsed = new Date(kill_time);
    if (!isNaN(parsed)) d = parsed;
  }
  if (!d) return null;
  const hrs = Number(interval);
  if (!isFinite(hrs) || hrs <= 0) return d.toISOString();
  d.setHours(d.getHours() + hrs + tzOffset);
  return d.toISOString();
}

function spawnTimeToMs(spawn_time) {
  if (!spawn_time) return Infinity;
  const parsed = new Date(spawn_time);
  if (!isNaN(parsed)) return parsed.getTime();
  const [hh, mm] = spawn_time.split(":").map(Number);
  const now = new Date();
  const d = new Date(now);
  d.setHours(hh, mm, 0, 0);
  if (d.getTime() <= now.getTime()) d.setDate(d.getDate() + 1);
  return d.getTime();
}

// Same as spawnTimeToMs but does NOT roll time-only entries to tomorrow.
// Used for expiry checks so past events are not kept alive indefinitely.
function spawnTimeToMsNoRoll(spawn_time) {
  if (!spawn_time) return Infinity;
  const parsed = new Date(spawn_time);
  if (!isNaN(parsed)) return parsed.getTime();
  const [hh, mm] = spawn_time.split(":").map(Number);
  const now = new Date();
  const d = new Date(now);
  d.setHours(hh, mm, 0, 0);
  return d.getTime();
}

function hasExplicitDate(spawn_time) {
  if (typeof spawn_time !== "string") return false;
  return /^\d{4}-\d{2}-\d{2}/.test(spawn_time);
}

function categoryPoints(boss) {
  if (boss.category === "ffa") return 5;
  if (boss.category === "red") return 3;
  return 0;
}

// events.time.days uses 0=Monday, 6=Sunday; JS getDay() uses 0=Sunday
function toEventDayIndex(jsDay) {
  return (jsDay + 6) % 7;
}

function computeEventSpawnTime(timeStr, tzOffset = 0) {
  if (!timeStr || timeStr.length < 4) return null;
  const baseHH = parseInt(timeStr.slice(0, 2), 10);
  const baseMM = parseInt(timeStr.slice(2, 4), 10);
  const d = new Date();
  d.setHours(baseHH + tzOffset, baseMM, 0, 0);
  if (Date.now() - d.getTime() > 5 * 60 * 1000) d.setDate(d.getDate() + 1);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function processEvents(events, tzOffset = 0) {
  const today = toEventDayIndex(new Date().getDay());
  return events
    .filter(e => e.is_active && Array.isArray(e.time?.days) && e.time.days.includes(today))
    .map(e => ({
      ...e,
      _type: "event",
      spawn_time: computeEventSpawnTime(e.time.time, tzOffset),
      points: e.time.points ?? null,
      link: e.link ?? e.time.link ?? null,
    }));
}

function withSpawnSorted(list, tzOffset = 0) {
  return list
    .filter(b => {
      const day = new Date().getDay(); 
      const invasionDays = [1, 3, 5]; 
      if (invasionDays.includes(day)) return true; 
      return b.type !== "invasion";
    })
    .map(b => {
      const baseKillTime = b.kill_timestamp ?? b.kill_time;
      return { ...b, spawn_time: computeSpawnTime(baseKillTime, b.interval, tzOffset) };
    })
    .sort((a, b) => {
      const now = Date.now();
      const timeDiff = Math.abs(spawnTimeToMs(a.spawn_time) - now) - Math.abs(spawnTimeToMs(b.spawn_time) - now);
      if (timeDiff !== 0) return timeDiff;
      return categoryPoints(b) - categoryPoints(a);
    });
}

function mergeAndSort(bosses, events, tzOffset = 0) {
  const bossList = withSpawnSorted(bosses, tzOffset).map(b => ({ ...b, _type: "boss" }));
  const eventList = processEvents(events, tzOffset);
  const combined = [...bossList, ...eventList];
  const now = Date.now();
  return combined.sort((a, b) => {
    const timeDiff =
      Math.abs(spawnTimeToMs(a.spawn_time) - now) -
      Math.abs(spawnTimeToMs(b.spawn_time) - now);
    if (timeDiff !== 0) return timeDiff;
    return categoryPoints(b) - categoryPoints(a);
  });
}

export default function BossContainer({ bosses = [], events = [], tzOffset = 0, ffaMode = "NORMAL", theme = "simple" }) {
  const [now, setNow] = useState(() => Date.now());

  const [visibleItems, setVisibleItems] = useState(() => mergeAndSort(bosses, events, tzOffset));

  // keep local copy in sync when props or timezone changes
  useEffect(() => {
    setVisibleItems(mergeAndSort(bosses, events, tzOffset));
  }, [bosses, events, tzOffset]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 5 * 1000);
    return () => clearInterval(t);
  }, []);

  // every tick, clear spawn if it's older than 2 minutes
  useEffect(() => {
    setVisibleItems(prev => {
      const cutoff = now - 2 * 60 * 1000; // keep until 120s after spawn
      return prev.filter(b => {
        if (!b.spawn_time) return true;
        // Use no-roll variant so time-only entries (events) are also expired
        // when they are more than 120s past their scheduled time.
        const ms = hasExplicitDate(b.spawn_time)
          ? spawnTimeToMs(b.spawn_time)
          : spawnTimeToMsNoRoll(b.spawn_time);
        if (isNaN(ms)) return true;
        return ms > cutoff;
      });
    });
  }, [now]);

  return (
    <div className={`card-grid${theme === 'noka' ? ' noka-grid' : ''}`}>
      <AnimatePresence>
        {visibleItems.map((item) => (
          <motion.div
            key={item._type === "event" ? `event-${item.name}` : item.name + item.type}
            layout
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{
              opacity: 0,
              x: -120,
              height: 0,
              margin: 0,
              padding: 0,
              transition: {
                x: { duration: 0.35 },
                opacity: { duration: 0.35 },
                height: { duration: 0.2, delay: 0.3 },
                margin: { duration: 0.2, delay: 0.3 },
                padding: { duration: 0.2, delay: 0.3 },
              },
            }}
            transition={{ duration: 0.35, layout: { duration: 0.4, ease: "easeOut" } }}
          >
            {item._type === "event"
              ? theme === "noka"
                ? <NokaEventCard event={item} />
                : <EventCard event={item} />
              : theme === "noka"
                ? <NokaBossCard boss={item} tzOffset={tzOffset} ffaMode={ffaMode} />
                : <BossCard boss={item} tzOffset={tzOffset} ffaMode={ffaMode} />}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}