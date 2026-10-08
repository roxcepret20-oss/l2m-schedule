// Same formula as the dashboard: sum of each stat multiplied by its configured multiplier.
export function getGearScore(member, formulas) {
  return formulas.reduce((sum, formula) => {
    const value = member?.stats?.[formula.stat_name];
    return value == null || value === "" ? sum : sum + Number(value) * Number(formula.stat_multiplier);
  }, 0);
}
