"use client";

import { useEffect, useState } from "react";
import PipelineCard from "./PipelineCard";
import { buildPipelineItems, groupIntoPipelines } from "@/lib/pipelineGrouping";
import styles from "./Pipeline.module.css";

export default function PipelineContainer({ bosses = [], events = [], tzOffset = 0, ffaMode = "NORMAL" }) {
  const [now, setNow] = useState(() => Date.now());
  const [items, setItems] = useState(() => buildPipelineItems(bosses, events, tzOffset, ffaMode));

  // rebuild the full timeline whenever the source data, timezone, or ffaMode changes
  useEffect(() => {
    setItems(buildPipelineItems(bosses, events, tzOffset, ffaMode));
  }, [bosses, events, tzOffset, ffaMode]);

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

  // Plain divs (no framer-motion) so pipeline cards always render reliably.
  // Groups can regroup (merge/split) whenever the timezone or underlying
  // data changes, which changes group identities wholesale — a
  // framer-motion AnimatePresence/exit setup here got stuck mid-animation
  // and left stale cards on screen instead of removing them.
  return (
    <div className={styles.pipelineList}>
      {groups.map((group, index) => (
        <PipelineCard key={group.id} group={group} now={now} isNextUp={index === 0} />
      ))}
    </div>
  );
}
