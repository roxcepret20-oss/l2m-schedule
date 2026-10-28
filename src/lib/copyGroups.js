export const DEFAULT_COPY_GAP_MINUTES = 3;

const toMinutes = (time) => {
  const [h, m] = String(time).split(":").map(Number);
  return h * 60 + m;
};

// Groups bosses of one day whose spawn times chain together: each boss is at most `gapMinutes`
// after the previous one (22:00, 22:02, 22:03, 22:05 is one group for a gap of 3). Events never join a group.
// Returns Map<entryId, entry[]> with the whole group (source included, ordered by time) for groups of 2 or more.
export function buildCopyGroups(entries, gapMinutes = DEFAULT_COPY_GAP_MINUTES) {
  const bosses = entries
    .filter((e) => e.kind !== "event")
    .map((e) => ({ entry: e, minutes: toMinutes(e.time) }))
    .sort((a, b) => a.minutes - b.minutes || a.entry.id - b.entry.id);

  const result = new Map();
  let group = [];
  const flush = () => {
    if (group.length > 1) {
      const list = group.map((g) => g.entry);
      list.forEach((entry) => result.set(entry.id, list));
    }
    group = [];
  };

  bosses.forEach((boss) => {
    if (group.length > 0 && boss.minutes - group[group.length - 1].minutes > gapMinutes) flush();
    group.push(boss);
  });
  flush();
  return result;
}
