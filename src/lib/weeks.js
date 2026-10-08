export const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export const DAY_SHORT = DAY_NAMES.map((d) => d.slice(0, 3));

const pad = (n) => String(n).padStart(2, "0");
const toIso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// "2026-09-28" -> Date at local midnight (no timezone shift, unlike new Date("2026-09-28")).
function parseIso(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function mondayOf(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

export function formatShortDate(iso) {
  const d = parseIso(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function formatWeek(weekStart, weekEnd) {
  return `${formatShortDate(weekStart)} – ${formatShortDate(weekEnd)}`;
}

// Mon–Sun options around the current week. The current week is flagged so it can be preselected.
export function weekOptions({ past = 8, future = 4, today = new Date() } = {}) {
  const current = mondayOf(today);
  const options = [];
  for (let i = -past; i <= future; i += 1) {
    const start = new Date(current);
    start.setDate(start.getDate() + i * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const value = toIso(start);
    options.push({ value, label: formatWeek(value, toIso(end)), isCurrent: i === 0 });
  }
  return options;
}

export function todayIso() {
  return toIso(new Date());
}
