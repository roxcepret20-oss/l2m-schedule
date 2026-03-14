"use client";

import { useEffect, useState } from "react";
import BossContainer from "../components/BossContainer";
import Loader from "../components/ClientSideLoader";
import { ffaBossList } from "../Helper/BossVariables";

const TIMEZONES = [
  { key: "WIB",  label: "WIB — West Indonesia (UTC+7)",  offset: 0 },
  { key: "WITA", label: "WITA — Central Indonesia (UTC+8)", offset: 1 },
  { key: "WIT",  label: "WIT — East Indonesia (UTC+9)",  offset: 2 },
  { key: "SGT",  label: "Singapore (UTC+8)",              offset: 1 },
  { key: "TH",   label: "Thailand (UTC+7)",               offset: 0 },
  { key: "VN",   label: "Vietnam (UTC+7)",                offset: 0 },
  { key: "PHT",  label: "Philippines (UTC+8)",            offset: 1 },
];

export default function FFABosses() {
  const [bosses, setBosses] = useState(null);
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
    const fetchBosses = () => {
      fetch("/api/bosses")
        .then(res => res.json())
        .then(data => {
          if (mounted) setBosses(data.filter(b => ffaBossList.includes(b.name)));
        })
        .catch(() => {});
    };
    fetchBosses();
    const interval = setInterval(fetchBosses, 10 * 60 * 1000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  if (!bosses) return <Loader />;

  const tzOffset = TIMEZONES.find(t => t.key === tzKey)?.offset ?? 0;

  return (
    <div>
      <div className="page-title">FFA Boss Schedule</div>
      <div className="tz-bar">
        <label className="tz-label" htmlFor="tz-select-ffa">Timezone</label>
        <select
          id="tz-select-ffa"
          className="tz-select"
          value={tzKey}
          onChange={e => handleTzChange(e.target.value)}
        >
          {TIMEZONES.map(tz => (
            <option key={tz.key} value={tz.key}>{tz.label}</option>
          ))}
        </select>
      </div>
      <BossContainer bosses={bosses} tzOffset={tzOffset} />
    </div>
  );
}