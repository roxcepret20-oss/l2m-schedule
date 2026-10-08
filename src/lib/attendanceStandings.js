export const GRADE_ORDER = ["S", "A", "B", "C", "D"];
export const DEFAULT_THRESHOLDS = { S: 90, A: 80, B: 60, C: 40, D: 30 };

// Same rules as the API. The target is the full attendance score (every entry of the week) divided by the handicap.
export function targetScore(fullScore, handicap) {
  return fullScore / handicap;
}

// Not capped: with a handicap above 1 a member can pass 100%.
export function percentOfTarget(points, fullScore, handicap) {
  return fullScore ? (points / targetScore(fullScore, handicap)) * 100 : 0;
}

// First grade whose minimum percent of the target is reached, otherwise E.
export function gradeFor(points, fullScore, handicap, thresholds) {
  if (!fullScore) return "E";
  const percent = percentOfTarget(points, fullScore, handicap);
  for (const grade of GRADE_ORDER) {
    if (percent >= thresholds[grade]) return grade;
  }
  return "E";
}

// Points per member from the days/entries/ticks, plus rank, percent of the target and grade.
export function computeStandings(members, days, thresholds, handicap) {
  // A missing or invalid handicap falls back to 1 so the numbers never turn into NaN.
  const safeHandicap = Number(handicap) > 0 ? Number(handicap) : 1;
  const points = new Map(members.map((m) => [m.id, 0]));
  let fullScore = 0;
  days.forEach((day) =>
    day.entries.forEach((entry) => {
      const value = Number(entry.points) || 0;
      fullScore += value;
      entry.member_ids.forEach((memberId) => {
        if (points.has(memberId)) points.set(memberId, points.get(memberId) + value);
      });
    })
  );

  const ranked = members
    .map((m) => ({ member_id: m.id, ign: m.ign, points: points.get(m.id) }))
    .sort((a, b) => b.points - a.points || a.ign.localeCompare(b.ign));

  let rank = 0;
  const standings = ranked.map((row, i) => {
    if (i === 0 || row.points !== ranked[i - 1].points) rank = i + 1;
    return {
      ...row,
      rank,
      percent: Math.round(percentOfTarget(row.points, fullScore, safeHandicap) * 10) / 10,
      grade: gradeFor(row.points, fullScore, safeHandicap, thresholds),
    };
  });

  return { standings, fullScore, targetScore: Math.round(targetScore(fullScore, safeHandicap) * 100) / 100 };
}
