"use client";

import { useEffect, useRef, useState } from "react";
import PipelineCard from "./PipelineCard";
import { buildPipelineItems, groupIntoPipelines } from "@/lib/pipelineGrouping";
import bossVoice from "../../Helper/BossVoice";
import eventVoice from "../../Helper/EventVoice";
import styles from "./Pipeline.module.css";

const FIVE_MIN_MS = 5 * 60 * 1000;
const ONE_MIN_MS = 60 * 1000;
const LATE_TOLERANCE_MS = 10 * 1000; // matches BossCard/EventCard's alert windows

export default function PipelineContainer({ bosses = [], events = [], tzOffset = 0, ffaMode = "NORMAL" }) {
  const [now, setNow] = useState(() => Date.now());
  const [items, setItems] = useState(() => buildPipelineItems(bosses, events, tzOffset, ffaMode));

  // per-item and per-chain "already announced" trackers, keyed by item.id /
  // group.id. Each entry also remembers the spawnDate/start it was recorded
  // against, so alerts re-arm if a regroup (e.g. timezone change) shifts a
  // spawn to a new time instead of staying silently "already played".
  const bossAlertsRef = useRef(new Map());
  const eventAlertsRef = useRef(new Map());
  const chainAlertsRef = useRef(new Map());

  // rebuild the full timeline whenever the source data, timezone, or ffaMode changes
  useEffect(() => {
    setItems(buildPipelineItems(bosses, events, tzOffset, ffaMode));
  }, [bosses, events, tzOffset, ffaMode]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    bossVoice.init();
    eventVoice.init();
  }, []);

  // drop items ~2min after spawn, mirroring BossContainer's expiry behavior
  useEffect(() => {
    setItems((prev) => {
      const cutoff = now - 2 * 60 * 1000;
      return prev.filter((item) => item.spawnDate.getTime() > cutoff);
    });
  }, [now]);

  const groups = groupIntoPipelines(items);

  // Per-item voice alerts: every boss and event in the pipeline gets the
  // same spoken alerts it would get on the Card view (boss: 5m / 1m / spawn,
  // event: 5m "prepare").
  useEffect(() => {
    const isVisible = typeof document === "undefined" ? true : !document.hidden;
    for (const item of items) {
      const spawnMs = item.spawnDate.getTime();
      const remaining = spawnMs - now;

      if (item._type === "boss") {
        let state = bossAlertsRef.current.get(item.id);
        if (!state || state.spawnMs !== spawnMs) {
          state = { spawnMs, played5: false, played1: false, playedNow: false };
          bossAlertsRef.current.set(item.id, state);
        }
        if (remaining <= FIVE_MIN_MS && remaining > ONE_MIN_MS && !state.played5) {
          state.played5 = true;
          bossVoice.speak(item.name, 5);
        }
        if (remaining <= ONE_MIN_MS && remaining > 0 && !state.played1) {
          state.played1 = true;
          bossVoice.speak(item.name, 1);
        }
        if (remaining <= 0 && remaining > -LATE_TOLERANCE_MS && !state.playedNow && isVisible) {
          state.playedNow = true;
          bossVoice.speak(item.name, 0);
        }
      } else if (item._type === "event") {
        let state = eventAlertsRef.current.get(item.id);
        if (!state || state.spawnMs !== spawnMs) {
          state = { spawnMs, played5: false };
          eventAlertsRef.current.set(item.id, state);
        }
        if (
          remaining <= FIVE_MIN_MS &&
          remaining > FIVE_MIN_MS - LATE_TOLERANCE_MS &&
          !state.played5 &&
          isVisible
        ) {
          state.played5 = true;
          eventVoice.speakPrepare(item.name);
        }
      }
    }
  }, [now, items]);

  // Chain-level voice alert: announce a multi-spawn chain 5 minutes before
  // its first boss/event spawns.
  useEffect(() => {
    const isVisible = typeof document === "undefined" ? true : !document.hidden;
    for (const group of groups) {
      if (group.isSingle) continue;
      const startMs = group.start.getTime();
      let state = chainAlertsRef.current.get(group.id);
      if (!state || state.startMs !== startMs) {
        state = { startMs, played5: false };
        chainAlertsRef.current.set(group.id, state);
      }
      const remaining = startMs - now;
      if (
        remaining <= FIVE_MIN_MS &&
        remaining > FIVE_MIN_MS - LATE_TOLERANCE_MS &&
        !state.played5 &&
        isVisible
      ) {
        state.played5 = true;
        bossVoice.speakChainAlert(group.items.length);
      }
    }
    // groups is derived fresh from items every render; comparing by identity
    // here would refire needlessly, so depend on now/items instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, items]);

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
