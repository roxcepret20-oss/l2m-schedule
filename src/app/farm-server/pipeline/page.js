"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import PipelineContainer from "../../components/Pipeline/PipelineContainer";
import Loader from "../../components/ClientSideLoader";
import LanguageSelect from "../../components/LanguageSelect";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { useSchedulePoints } from "@/lib/useSchedulePoints";
import styles from "../../components/Pipeline/Pipeline.module.css";

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

export default function FarmServerPipelinePage() {
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const [bosses, setBosses] = useState(null);
  const pointsConfig = useSchedulePoints("/farm-server");
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
        .then((res) => res.json())
        .then((data) => { if (mounted) setEvents(Array.isArray(data) ? data : []); })
        .catch(() => { if (mounted) setEvents([]); });
    };

    const fetchFfaDays = () => {
      fetch("/api/ffa-day")
        .then((res) => res.json())
        .then((data) => { if (mounted) setFfaDays(data); })
        .catch(() => { if (mounted) setFfaDays(null); });
    };

    const fetchBosses = () => {
      fetch("/api/bosses?source=farm")
        .then((res) => res.json())
        .then((data) => { if (mounted) setBosses(data); })
        .catch(() => { if (mounted) setBosses([]); });
    };

    fetchEvents();
    fetchFfaDays();
    fetchBosses();
    const interval = setInterval(fetchBosses, 2 * 60 * 60 * 1000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  if (!bosses || !events || !ffaDays) return <Loader />;

  const tzOffset = TIMEZONES.find((t) => t.key === tzKey)?.offset ?? 0;
  const ffaMode = ffaDays?.is_ffa ?? "NORMAL";
  const view = searchParams.get("view") || "all";

  return (
    <div>
      <div className="tz-bar">
        <label className="tz-label" htmlFor="farm-pipeline-tz-select">{t("Timezone")}</label>
        <select
          id="farm-pipeline-tz-select"
          className="tz-select"
          value={tzKey}
          onChange={(e) => handleTzChange(e.target.value)}
        >
          {TIMEZONES.map((tz) => (
            <option key={tz.key} value={tz.key}>{tz.label}</option>
          ))}
        </select>
      </div>
      <LanguageSelect />
      <div className={styles.pageHeader}>
        <h1>{t("Farm Server Pipelines")}</h1>
        <p>{t("Bosses & events grouped by spawn-time chains")}</p>
      </div>
      <PipelineContainer bosses={bosses} events={events} tzOffset={tzOffset} ffaMode={ffaMode} view={view} pointsConfig={pointsConfig} />
    </div>
  );
}
