// Grouping logic for the /pipeline page: merges bosses + events into a single
// chronological timeline, then splits that timeline into "pipelines" (chains)
// wherever the gap between two consecutive spawns exceeds GAP_MS.

export const PIPELINE_GAP_MS = 10 * 60 * 1000; // 10 minutes
const EXPIRY_MS = 2 * 60 * 1000; // keep items visible until 2min after spawn

function computeBossSpawnDate(kill_time, interval, tzOffset = 0) {
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
  // interval may be fractional (e.g. 2.5 = 2h30m), so add via minutes to avoid truncation
  if (isFinite(hrs) && hrs > 0) d.setMinutes(d.getMinutes() + Math.round((hrs + tzOffset) * 60));
  return d;
}

// events.time.days uses 0=Monday, 6=Sunday; JS getDay() uses 0=Sunday
function toEventDayIndex(jsDay) {
  return (jsDay + 6) % 7;
}

// places is keyed by day-of-week ("0".."6", Monday=0) with an array of place
// names indexed by the event's current rotation number.
function resolveEventPlace(e, today) {
  const places = e.time?.places;
  if (!places) return null;
  const arr = places[String(today)];
  if (!Array.isArray(arr)) return null;
  return arr[e.rotation] ?? null;
}

function computeEventSpawnDate(timeStr, tzOffset = 0) {
  if (!timeStr || timeStr.length < 4) return null;
  const baseHH = parseInt(timeStr.slice(0, 2), 10);
  const baseMM = parseInt(timeStr.slice(2, 4), 10);
  const d = new Date();
  d.setHours(baseHH + tzOffset, baseMM, 0, 0);
  if (Date.now() - d.getTime() > 5 * 60 * 1000) d.setDate(d.getDate() + 1);
  return d;
}

function tagForBoss(boss) {
  if (boss.type === "invasion") return "INVASION";
  if (boss.category === "ffa") return "FFA";
  if (boss.category === "red") return "RED";
  return null;
}

/**
 * Merge bosses + events (same source data as the home page) into a single
 * chronologically-sorted list of timeline items, each with a resolved
 * `spawnDate` (Date) usable for chaining/countdowns.
 */
export function buildPipelineItems(bosses = [], events = [], tzOffset = 0) {
  const safeBosses = Array.isArray(bosses) ? bosses : [];
  const safeEvents = Array.isArray(events) ? events : [];
  const now = Date.now();
  const day = new Date().getDay();
  const invasionDays = [1, 3, 5];
  const todayEventIndex = toEventDayIndex(day);

  const bossItems = safeBosses
    .filter((b) => (invasionDays.includes(day) ? true : b.type !== "invasion"))
    .map((b) => {
      const baseKillTime = b.kill_timestamp ?? b.kill_time;
      const spawnDate = computeBossSpawnDate(baseKillTime, b.interval, tzOffset);
      return {
        id: `boss-${b.name}-${b.type ?? ""}`,
        _type: "boss",
        name: b.name,
        category: b.category,
        type: b.type,
        tag: tagForBoss(b),
        spawnDate,
        raw: b,
      };
    });

  const eventItems = safeEvents
    .filter((e) => e.is_active && Array.isArray(e.time?.days) && e.time.days.includes(todayEventIndex))
    .map((e) => {
      const place = resolveEventPlace(e, todayEventIndex);
      const spawnDate = computeEventSpawnDate(e.time.time, tzOffset);
      return {
        id: `event-${e.name}`,
        _type: "event",
        name: place ? `${e.name} - ${place}` : e.name,
        category: null,
        type: null,
        tag: "EVENT",
        spawnDate,
        raw: e,
      };
    });

  return [...bossItems, ...eventItems]
    .filter((item) => item.spawnDate && item.spawnDate.getTime() > now - EXPIRY_MS)
    .sort((a, b) => a.spawnDate.getTime() - b.spawnDate.getTime());
}

/**
 * Splits a chronologically-sorted list of timeline items into pipelines
 * (chains): a new pipeline starts whenever the gap to the previous item's
 * spawn exceeds `gapMs`.
 */
export function groupIntoPipelines(items, gapMs = PIPELINE_GAP_MS) {
  const groups = [];
  let current = null;

  for (const item of items) {
    if (!current || item.spawnDate.getTime() - current.items[current.items.length - 1].spawnDate.getTime() > gapMs) {
      current = { items: [item] };
      groups.push(current);
    } else {
      current.items.push(item);
    }
  }

  return groups.map((group, index) => {
    const start = group.items[0].spawnDate;
    const end = group.items[group.items.length - 1].spawnDate;
    const spanMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
    return {
      id: `pipeline-${index}-${start.getTime()}`,
      items: group.items,
      start,
      end,
      spanMinutes,
      isSingle: group.items.length === 1,
    };
  });
}

export function getCountdownUrgency(remainingMs) {
  if (remainingMs <= 0) return "done";
  if (remainingMs <= 5 * 60 * 1000) return "imminent";
  if (remainingMs <= 15 * 60 * 1000) return "soon";
  return "safe";
}

export function formatCountdown(ms) {
  if (ms > 0) {
    const totalSec = Math.floor(ms / 1000);
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    const s = `${String(seconds).padStart(2, "0")}s`;
    const m = `${String(minutes).padStart(2, "0")}m`;
    if (hours > 0) return `${hours}h ${m} ${s}`;
    return `${minutes}m ${s}`;
  }
  return `-${Math.abs(Math.ceil(ms / 1000))}s`;
}

export function formatSpawnDisplay(spawnDate) {
  if (!spawnDate) return "—";
  const hh = String(spawnDate.getHours()).padStart(2, "0");
  const mm = String(spawnDate.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}
