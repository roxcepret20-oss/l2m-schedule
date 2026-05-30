"use client";

import { useEffect, useState } from "react";
import BossCard from "./BossCard/BossCard";
import EventCard from "./EventCard/EventCard";
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
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function spawnTimeToMs(spawn_time) {
  if (!spawn_time) return Infinity;
  const [hh, mm] = spawn_time.split(":").map(Number);
  const now = new Date();
  const d = new Date(now);
  d.setHours(hh, mm, 0, 0);
  if (d.getTime() <= now.getTime()) d.setDate(d.getDate() + 1);
  return d.getTime();
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
    .map(b => ({ ...b, spawn_time: computeSpawnTime(b.kill_time, b.interval, tzOffset) }))
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

export default function BossContainer({ bosses = [], events = [], tzOffset = 0 }) {
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
      const cutoff = now - 2 * 60 * 1000; // 1 minute ago
      return prev.filter(b => {
        if (!b.spawn_time) return true;
        const [hh, mm] = b.spawn_time.split(":").map(Number);
        const d = new Date();
        d.setHours(hh, mm, 0, 0);
        const ms = d.getTime();
        
        if (isNaN(ms)) return true;
        // keep if not expired, OR if the difference is more than 30 min
        // (large gap = spawn is actually tomorrow, not truly expired)
        return ms > cutoff || (cutoff - ms) > 30 * 60 * 1000;
      });
    });
  }, [now]);

  return (
    <div className="card-grid">
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
              ? <EventCard event={item} />
              : <BossCard boss={item} tzOffset={tzOffset} />}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}