// Points shown on the boss list and pipeline for ffa/red bosses (WIB wall clock, JS getDay: 0 = Sunday):
//   00:00-07:59 -> 5 every day
//   08:00-23:59 -> 5 on Mon/Wed/Fri, 3 on Tue/Thu/Sat/Sun
const FIVE_POINT_DAYS = [1, 3, 5];

function toWibDate(spawnDate, tzOffset) {
  const baseDate = spawnDate ?? new Date();
  const wibMs = baseDate.getTime()
    + (7 * 60 + baseDate.getTimezoneOffset()) * 60 * 1000
    - tzOffset * 60 * 60 * 1000;
  return new Date(wibMs);
}

export function getBossPoints(spawnDate = null, tzOffset = 0) {
  const wibDate = toWibDate(spawnDate, tzOffset);
  if (wibDate.getHours() < 8) return 5;
  return FIVE_POINT_DAYS.includes(wibDate.getDay()) ? 5 : 3;
}

// /alt-server points (WIB wall clock), every day, every boss category:
//   00:00-07:59 -> ffa/red 5, other bosses 2
//   08:00-23:59 -> ffa/red 3, other bosses 1
export function getAltServerBossPoints(category, spawnDate = null, tzOffset = 0) {
  const early = toWibDate(spawnDate, tzOffset).getHours() < 8;
  if (category === "ffa" || category === "red") return early ? 5 : 3;
  return early ? 2 : 1;
}
