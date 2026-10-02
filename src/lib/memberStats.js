const DEFENSE_STAT_NAMES = ["defense", "physicaldefense", "pdef"];

function normalizeStatName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function getDefenseStat(member) {
  const stats = member?.stats;
  if (!stats || typeof stats !== "object") return null;

  const entries = Object.entries(stats);
  for (const name of DEFENSE_STAT_NAMES) {
    const entry = entries.find(([statName]) => normalizeStatName(statName) === name);
    if (entry && entry[1] != null && entry[1] !== "") return entry[1];
  }

  return null;
}
