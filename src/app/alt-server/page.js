"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import BossContainer from "../components/BossContainer";
import { MULTI_CLAN_MODE, CLAN_PRIMARY, CLAN_SECONDARY } from "../../lib/featureFlags";
import Loader from "../components/ClientSideLoader";

const TIMEZONES = [
  { key: "WIB",  label: "WIB — West Indonesia (UTC+7)",  offset: 0 },
  { key: "WITA", label: "WITA — Central Indonesia (UTC+8)", offset: 1 },
  { key: "WIT",  label: "WIT — East Indonesia (UTC+9)",  offset: 2 },
  { key: "SGT",  label: "Singapore (UTC+8)",              offset: 1 },
  { key: "TH",   label: "Thailand (UTC+7)",               offset: 0 },
  { key: "VN",   label: "Vietnam (UTC+7)",                offset: 0 },
  { key: "PHT",  label: "Philippines (UTC+8)",            offset: 1 },
  { key: "MY",   label: "Malaysia (UTC+8)",               offset: 1 },
];

function parseSpawnToDate(spawn) {
  if (!spawn) return null;
  if (spawn instanceof Date) return spawn;
  const iso = new Date(spawn);
  if (!isNaN(iso)) return iso;
  const hhmm = String(spawn).match(/^(\d{1,2}):(\d{2})$/);
  if (!hhmm) return null;
  const now = new Date();
  const d = new Date(now);
  d.setHours(parseInt(hhmm[1], 10), parseInt(hhmm[2], 10), 0, 0);
  if (now.getTime() - d.getTime() > 5 * 60 * 1000) d.setDate(d.getDate() + 1);
  return d;
}

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
  if (isFinite(hrs) && hrs > 0) d.setHours(d.getHours() + hrs + tzOffset);
  return d;
}

function getClanType(spawnDate, tzOffset = 0, category, ffaMode = "NORMAL") {
  if (ffaMode === "WAR") return "both";
  if (category === "ffa") return "both";
  if (!spawnDate) return "both";

  const wibMs = spawnDate.getTime()
    + (7 * 60 + spawnDate.getTimezoneOffset()) * 60 * 1000
    - tzOffset * 60 * 60 * 1000;
  const wibDate = new Date(wibMs);
  const day = wibDate.getDay();
  const hour = wibDate.getHours();

  if (ffaMode === "NORMAL" && [1, 3, 5].includes(day) && hour >= 8) return "both";
  if (hour < 8) return "both";
  if (hour < 16) return CLAN_PRIMARY;
  return CLAN_SECONDARY;
}

export default function AltServerBosses() {
  const searchParams = useSearchParams();
  const [bosses, setBosses] = useState(null);
  const [events, setEvents] = useState(null);
  const [ffaDays, setFfaDays] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [tzKey, setTzKey] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("tzKey") || "WIB";
    }
    return "WIB";
  });

  function handleTzChange(key) {
    setTzKey(key);
    localStorage.setItem("tzKey", key);
  }

  useEffect(() => {
    let mounted = true;

    const fetchEvents = () => {
      fetch("/api/events")
        .then(res => res.json())
        .then(data => { if (mounted) setEvents(Array.isArray(data) ? data : []); })
        .catch(() => { if (mounted) setEvents([]); });
    };

    const fetchFfaDays = () => {
      fetch("/api/ffa-day")
        .then(res => res.json())
        .then(data => { if (mounted) setFfaDays(data); })
        .catch(() => { if (mounted) setFfaDays(null); });
    };

    const fetchBosses = () => {
      fetch("/api/bosses?source=duplicate")
        .then(res => res.json())
        .then(data => { if (mounted) setBosses(data); })
        .catch(() => { if (mounted) setBosses([]); });
    };

    fetchEvents();
    fetchFfaDays();
    fetchBosses();
    const interval = setInterval(fetchBosses, 2 * 60 * 60 * 1000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  useEffect(() => {
    let dailyId = null;

    const getMsUntilNextJakarta0015 = () => {
      const DAY_MS = 24 * 60 * 60 * 1000;
      const MINUTE_MS = 60 * 1000;
      const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;
      const TARGET_MS = 15 * MINUTE_MS;

      const nowMs = Date.now();
      const jakartaMsInDay = ((nowMs + JAKARTA_OFFSET_MS) % DAY_MS + DAY_MS) % DAY_MS;
      let delta = TARGET_MS - jakartaMsInDay;
      if (delta <= 0) delta += DAY_MS;
      return delta;
    };

    const timeoutId = setTimeout(() => {
      setRefreshKey(prev => prev + 1);
      dailyId = setInterval(() => {
        setRefreshKey(prev => prev + 1);
      }, 24 * 60 * 60 * 1000);
    }, getMsUntilNextJakarta0015());

    return () => {
      clearTimeout(timeoutId);
      if (dailyId) clearInterval(dailyId);
    };
  }, []);

  if (!bosses || !events || !ffaDays) return (
    <Loader />
  );

  const tzOffset = TIMEZONES.find(t => t.key === tzKey)?.offset ?? 0;
  const ffaMode = ffaDays?.is_ffa ?? "NORMAL";
  const view = searchParams.get("view") || "all";

  const filteredBosses = (bosses || []).filter((boss) => {
    if (view === "ffa") return boss.category === "ffa";
    if (MULTI_CLAN_MODE && (view === CLAN_SECONDARY || view === CLAN_PRIMARY)) {
      if (boss.category === "ffa") return true;
      const baseKillTime = boss.kill_timestamp ?? boss.kill_time;
      const spawnDate = computeSpawnTime(baseKillTime, boss.interval, tzOffset)
        || parseSpawnToDate(baseKillTime);
      const clan = getClanType(spawnDate, tzOffset, boss.category, ffaMode);
      return clan === view || clan === "both";
    }
    return true;
  });

  return (
    <div>
      <div className="page-title">All Boss Schedule</div>
      <div className="tz-bar">
        <label className="tz-label" htmlFor="tz-select">Timezone</label>
        <select
          id="tz-select"
          className="tz-select"
          value={tzKey}
          onChange={e => handleTzChange(e.target.value)}
        >
          {TIMEZONES.map(tz => (
            <option key={tz.key} value={tz.key}>{tz.label}</option>
          ))}
        </select>
      </div>
      <BossContainer
        key={refreshKey}
        bosses={filteredBosses}
        events={events}
        tzOffset={tzOffset}
        ffaMode={ffaMode}
      />
    </div>
  );
}
