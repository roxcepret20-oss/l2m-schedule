"use client";

import { useEffect, useState } from "react";
import { fetchSchedulePoints } from "./attendancePoints";

const REFRESH_MS = 2 * 60 * 60 * 1000;

// Attendance-settings points for the clan on `path`; null while loading, when unreachable or when `path`
// is falsy (servers that do not use the attendance system).
export function useSchedulePoints(path) {
  const [config, setConfig] = useState(null);

  useEffect(() => {
    if (!path) return undefined;
    let mounted = true;
    const load = () => {
      fetchSchedulePoints(path)
        .then((data) => { if (mounted) setConfig(data); })
        .catch(() => {});
    };
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => { mounted = false; clearInterval(id); };
  }, [path]);

  return config;
}
