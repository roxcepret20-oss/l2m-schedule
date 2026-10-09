// Time-window point rules. Mirrors the attendance API (l2m-attendance-system-api src/utils/pointRules.js):
// windows are inclusive to the minute, start > end wraps midnight, the first matching rule wins and a boss's
// own rules replace the global ones.

export const MAX_RULES = 24;

export const timeToMinutes = (time) => {
  const [h, m] = String(time).split(":");
  return Number(h) * 60 + Number(m);
};

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const windows = (rule) => {
  const start = timeToMinutes(rule.start_time);
  const end = timeToMinutes(rule.end_time);
  return start <= end ? [[start, end]] : [[start, 1439], [0, end]];
};

const overlaps = (a, b) => windows(a).some(([aFrom, aTo]) => windows(b).some(([bFrom, bTo]) => aFrom <= bTo && bFrom <= aTo));

export const emptyRule = () => ({ label: "", start_time: "00:00", end_time: "23:59", points: "10" });

export const toEditableRules = (rules) => (rules ?? []).map((r) => ({ ...r, points: String(r.points) }));

export const toPayloadRules = (rules) =>
  rules.map((r) => ({ label: r.label.trim(), start_time: r.start_time, end_time: r.end_time, points: Number(r.points) }));

// Returns an error message, or "" when the rules are valid.
export function validateRules(rules) {
  if (rules.length > MAX_RULES) return `At most ${MAX_RULES} rules are allowed.`;
  for (let i = 0; i < rules.length; i += 1) {
    const r = rules[i];
    if (!r.label.trim()) return `Rule ${i + 1}: label is required.`;
    if (!TIME_PATTERN.test(r.start_time) || !TIME_PATTERN.test(r.end_time)) return `Rule ${i + 1}: start and end time are required.`;
    if (r.points === "" || !Number.isInteger(Number(r.points)) || Number(r.points) < 0) return `Rule ${i + 1}: points must be a whole number of 0 or more.`;
  }
  for (let i = 0; i < rules.length; i += 1) {
    for (let j = i + 1; j < rules.length; j += 1) {
      if (overlaps(rules[i], rules[j])) return `Rules "${rules[i].label.trim()}" and "${rules[j].label.trim()}" overlap.`;
    }
  }
  return "";
}

// The rule that applies to a boss at "HH:MM", or null (then the boss's default points apply).
export function findRule(time, boss, globalRules) {
  if (!time) return null;
  const own = boss?.point_rules;
  const list = own && own.length > 0 ? own : globalRules ?? [];
  const minutes = timeToMinutes(time);
  return list.find((rule) => windows(rule).some(([from, to]) => minutes >= from && minutes <= to)) ?? null;
}

export const resolvePoints = (time, boss, globalRules) => findRule(time, boss, globalRules)?.points ?? boss.default_points;

export const describeRule = (r) => `${r.label}: ${r.start_time}–${r.end_time} → ${r.points}p`;
