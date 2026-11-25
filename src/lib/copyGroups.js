export const DEFAULT_COPY_GAP_MINUTES = 3;

const toMinutes = (time) => {
  const [h, m] = String(time).split(":").map(Number);
  return h * 60 + m;
};

// Splits entries (ordered by time) into chains: each one is at most `gapMinutes` after the previous one
// (22:00, 22:02, 22:03, 22:05 is one chain for a gap of 3).
const chainByTime = (entries, gapMinutes) => {
  const sorted = [...entries].sort((a, b) => toMinutes(a.time) - toMinutes(b.time) || a.id - b.id);
  const chains = [];
  sorted.forEach((entry) => {
    const chain = chains[chains.length - 1];
    if (chain && toMinutes(entry.time) - toMinutes(chain[chain.length - 1].time) <= gapMinutes) chain.push(entry);
    else chains.push([entry]);
  });
  return chains;
};

// Which entries of one day can receive another entry's ticks. Returns Map<entryId, entry[]> with the whole
// group (source included, ordered by time) for groups of 2 or more.
// - Boss: the bosses chained with it by time. Events never join a boss group.
// - Event: that event plus the bosses chained with it (other events are left out).
export function buildCopyGroups(entries, gapMinutes = DEFAULT_COPY_GAP_MINUTES) {
  const bosses = entries.filter((e) => e.kind !== "event");
  const result = new Map();

  chainByTime(bosses, gapMinutes)
    .filter((group) => group.length > 1)
    .forEach((group) => group.forEach((boss) => result.set(boss.id, group)));

  entries
    .filter((e) => e.kind === "event")
    .forEach((event) => {
      const group = chainByTime([...bosses, event], gapMinutes).find((chain) => chain.includes(event));
      if (group.length > 1) result.set(event.id, group);
    });

  return result;
}
