"use client";

import { useEffect, useState } from "react";
import BossContainer from "./components/BossContainer";
import Loader from "./components/ClientSideLoader";

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

export default function Bosses() {
  const [bosses, setBosses] = useState(null);
  const [events, setEvents] = useState(null);
  const [ffaDays, setFfaDays] = useState(null);
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
      fetch("/api/bosses")
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

  if (!bosses || !events || !ffaDays) return (
    <Loader />
  );

  const tzOffset = TIMEZONES.find(t => t.key === tzKey)?.offset ?? 0;
  const ffaMode = ffaDays?.is_ffa ?? "NORMAL";

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
      <BossContainer bosses={bosses} events={events} tzOffset={tzOffset} ffaMode={ffaMode} />
    </div>
  );
}