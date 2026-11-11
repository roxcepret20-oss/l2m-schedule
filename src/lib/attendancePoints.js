import { API_BASE } from "./attendanceApi";

// Points shown on the schedule pages come from the attendance system (l2m-attendance-system-api):
// the settings of the clan whose boss_schedule_path is the page's path ("/" or "/farm-server").
// A boss/event that is not in the clan's attendance settings has no points. Same resolution as the API's
// resolvePoints: the boss's own rules, else the clan's global scheme, else the boss's default points.

export async function fetchSchedulePoints(path) {
  const res = await fetch(`${API_BASE}/api/schedule-points?path=${encodeURIComponent(path)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

const sameName = (a, b) => String(a ?? "").trim().toLowerCase() === String(b ?? "").trim().toLowerCase();

// Date whose local getters (getHours/getDay) read as WIB wall clock, undoing the page's tz offset.
export function toWibDate(spawnDate, tzOffset = 0) {
  const baseDate = spawnDate ?? new Date();
  const wibMs = baseDate.getTime()
    + (7 * 60 + baseDate.getTimezoneOffset()) * 60 * 1000
    - tzOffset * 60 * 60 * 1000;
  return new Date(wibMs);
}

function minutesOf(hhmm) {
  const m = String(hhmm ?? "").match(/^(\d{1,2}):(\d{2})/);
  return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : null;
}

// Windows are inclusive; start > end wraps past midnight. days: 0 = Monday; empty = every day.
function ruleMatches(rule, minutes, day) {
  if (Array.isArray(rule.days) && rule.days.length > 0 && !rule.days.includes(day)) return false;
  const start = minutesOf(rule.start_time);
  const end = minutesOf(rule.end_time);
  if (start == null || end == null) return false;
  return start <= end ? minutes >= start && minutes <= end : minutes >= start || minutes <= end;
}

// Points (number) for a boss, or null when it has none. With no config (E5/E6, API unreachable) -> null.
export function resolveBossPoints(config, bossName, spawnDate = null, tzOffset = 0) {
  if (!config) return null;
  const boss = (config.bosses ?? []).find((b) => sameName(b.name, bossName));
  if (!boss) return null;

  let points = boss.default_points;
  if (spawnDate) {
    const wib = toWibDate(spawnDate, tzOffset);
    const minutes = wib.getHours() * 60 + wib.getMinutes();
    const day = (wib.getDay() + 6) % 7;
    const rules = boss.point_rules?.length ? boss.point_rules : (config.point_rules ?? []);
    const rule = rules.find((r) => ruleMatches(r, minutes, day));
    if (rule) points = rule.points;
  }
  return points > 0 ? points : null;
}

// Points ([number]) for an event matched by name (candidates in priority order); the template running
// on `todayIndex` (0 = Monday) wins when the name exists on several days. null when not in the settings.
export function resolveEventPoints(config, names, todayIndex) {
  if (!config) return null;
  for (const name of names) {
    const found = (config.events ?? []).filter((e) => sameName(e.name, name));
    if (found.length === 0) continue;
    const event = found.find((e) => Array.isArray(e.days) && e.days.includes(todayIndex)) ?? found[0];
    return event.points > 0 ? [event.points] : null;
  }
  return null;
}
