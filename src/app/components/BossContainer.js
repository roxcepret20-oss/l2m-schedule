"use client";

import { useEffect, useState } from "react";
import BossCard from "./BossCard/BossCard";
import { motion, AnimatePresence } from "framer-motion";

function computeSpawnTime(kill_time, interval) {
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
  d.setHours(d.getHours() + hrs);
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

function withSpawnSorted(list) {
  return list
    .filter(b => {
      const day = new Date().getDay(); 
      const invasionDays = [1, 3, 5]; 
      if (invasionDays.includes(day)) return true; 
      return b.type !== "invasion";
    })
    .map(b => ({ ...b, spawn_time: computeSpawnTime(b.kill_time, b.interval) }))
    .sort((a, b) => {
      const now = Date.now();
      return Math.abs(spawnTimeToMs(a.spawn_time) - now) - Math.abs(spawnTimeToMs(b.spawn_time) - now);
    });
}

export default function BossContainer({ bosses = [], tzOffset = 0 }) {
  const [now, setNow] = useState(() => Date.now());

  // local copy of bosses so we can update spawn values (e.g. clear expired)
  const [visibleBosses, setVisibleBosses] = useState(() => withSpawnSorted(bosses));

  // keep local copy in sync when prop changes
  useEffect(() => {
    setVisibleBosses(withSpawnSorted(bosses));
  }, [bosses]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 5 * 1000);
    return () => clearInterval(t);
  }, []);

  // every tick, clear spawn if it's older than 1 minute
  useEffect(() => {
    setVisibleBosses(prev => {
      const cutoff = now - 60 * 1000; // 1 minute ago
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
        {visibleBosses.map((boss, index) => (
          <motion.div
            key={boss.name+boss.type+index}
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
            transition={{ duration: 0.35 }}
          >
             <BossCard key={index} boss={boss} tzOffset={tzOffset} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}