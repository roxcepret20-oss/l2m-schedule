"use client";

import { useEffect, useState } from "react";
import BossCard from "./BossCard/BossCard";
import { motion, AnimatePresence } from "framer-motion";

export default function BossContainer({ bosses = [] }) {
  const [now, setNow] = useState(() => Date.now());

  // local copy of bosses so we can update spawn values (e.g. clear expired)
  const [visibleBosses, setVisibleBosses] = useState(() => bosses.map(b => ({ ...b })));

  // keep local copy in sync when prop changes
  useEffect(() => {
    setVisibleBosses(bosses.map(b => ({ ...b })));
  }, [bosses]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // every tick, clear spawn if it's older than 1 minute
 useEffect(() => {
  setVisibleBosses(prev => {
    const cutoff = now - 1 * 60 * 1000; // 1 minute ago
    return prev.filter(b => {
      if (!b.spawn) return true;
      const ms = b.spawn instanceof Date
        ? b.spawn.getTime()
        : (typeof b.spawn === "number" ? b.spawn : Date.parse(b.spawn));
      if (isNaN(ms)) return true;
      return ms >= cutoff; // keep non-expired
    });
  });
}, [now]);

  return (
    <div className="card-grid">
      <AnimatePresence>
        {visibleBosses.map((boss, index) => (
          <motion.div
            key={boss.norm || boss.name}
            layout
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -120, height: 0, margin: 0, padding: 0 }}
            transition={{ duration: 0.35 }}
          >
             <BossCard key={index} boss={boss} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}