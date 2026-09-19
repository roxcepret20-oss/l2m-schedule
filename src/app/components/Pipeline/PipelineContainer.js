"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import PipelineCard from "./PipelineCard";
import { buildPipelineItems, groupIntoPipelines } from "@/lib/pipelineGrouping";
import styles from "./Pipeline.module.css";

export default function PipelineContainer({ bosses = [], events = [], tzOffset = 0 }) {
  const [now, setNow] = useState(() => Date.now());
  const [items, setItems] = useState(() => buildPipelineItems(bosses, events, tzOffset));

  // rebuild the full timeline whenever the source data or timezone changes
  useEffect(() => {
    setItems(buildPipelineItems(bosses, events, tzOffset));
  }, [bosses, events, tzOffset]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // drop items ~2min after spawn, mirroring BossContainer's expiry behavior
  useEffect(() => {
    setItems((prev) => {
      const cutoff = now - 2 * 60 * 1000;
      return prev.filter((item) => item.spawnDate.getTime() > cutoff);
    });
  }, [now]);

  const groups = groupIntoPipelines(items);

  if (groups.length === 0) {
    return <div className={styles.emptyState}>No upcoming bosses or events right now.</div>;
  }

  return (
    <div className={styles.pipelineList}>
      <AnimatePresence>
        {groups.map((group, index) => (
          <motion.div
            key={group.id}
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, layout: { duration: 0.35, ease: "easeOut" } }}
          >
            <PipelineCard group={group} now={now} isNextUp={index === 0} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
