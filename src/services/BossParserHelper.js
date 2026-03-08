export default class BossParser {
  cleanInput(text) {
    if (typeof text !== "string") return "";
    return text
      .replace(/\r\n/g, "\n")
      .replace(/[🔴🟡🔵🟢]+/g, "")
      .replace(/[^a-zA-Z0-9:\n\s]/g, "")
      .replace(/[ \t]+/g, " ")
      .trim();
  }

  normalize(name) {
    return String(name || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .trim();
  }

  parseBossContent(content) {
    const bosses = [];
    const cleanedInput = this.cleanInput(content);
    const lines = cleanedInput.split("\n").map(l => l.trim()).filter(Boolean);

    for (let i = 0; i < lines.length; i++) {
      if (/\d{1,2}:\d{2}/.test(lines[i])) {
        const timeMatch = lines[i].match(/(\d{2}:\d{2})/);
        const percentMatch = lines[i].match(/\b(100|50|33)\b/);
        const percent = percentMatch ? `${percentMatch[1]}%` : null;
        if (!timeMatch) continue;

        let bossName = null;
        for (let j = i - 1; j >= 0; j--) {
          if (!lines[j].toUpperCase().includes("SPAWNING")) {
            bossName = lines[j];
            break;
          }
        }
        if (!bossName) continue;

        const [h, m] = timeMatch[1].split(":").map(Number);
        const spawn = new Date();
        spawn.setHours(h, m, 0, 0);
        if (spawn < new Date()) spawn.setDate(spawn.getDate() + 1);

        bosses.push({
          name: bossName,
          percent,
          norm: this.normalize(bossName),
          spawn,
          alarm5: false,
          alarm1: false,
          alarmNow: false,
        });
      }
    }

    const now = Date.now();
    bosses.sort((a, b) => (a.spawn.getTime() - now) - (b.spawn.getTime() - now));
    return bosses;
  }
}