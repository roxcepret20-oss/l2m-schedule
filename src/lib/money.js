// Whole-diamond money math, mirroring the API. BigInt keeps products exact; results round half up.

function mulDivRound(a, b, c) {
  const d = BigInt(c);
  return Number((2n * BigInt(a) * BigInt(b) + d) / (2n * d));
}

function taxAmount(value, percent) {
  return mulDivRound(value, Math.round(Number(percent) * 100), 10000);
}

// Taxes apply one after another: 100,000 -> -8% = 92,000 -> -5% = 87,400.
export function applyTaxChain(amount, taxes) {
  let value = amount;
  const steps = taxes.map((tax) => {
    const taxed = taxAmount(value, tax.percent);
    value -= taxed;
    return { name: tax.name, percent: Number(tax.percent), amount: taxed, after: value };
  });
  return { steps, net: value };
}

export function netReceived(paid, taxes) {
  return applyTaxChain(paid, taxes).net;
}

// diamonds = ROUND(grade value / total grade values * total diamonds), per member.
export function distributeSalary(members, scores, totalDiamonds) {
  const valueOf = (grade) => scores[grade] || 0;
  const totalValues = members.reduce((sum, m) => sum + valueOf(m.grade), 0);

  const rows = members.map((m) => {
    const value = valueOf(m.grade);
    return {
      member_id: m.member_id,
      grade: m.grade,
      share_percent: totalValues ? Math.round((value / totalValues) * 10000) / 100 : 0,
      diamonds: totalValues ? mulDivRound(value, totalDiamonds, totalValues) : 0,
    };
  });

  const distributed = rows.reduce((sum, r) => sum + r.diamonds, 0);
  return { rows, total_grade_values: totalValues, distributed, remainder: totalDiamonds - distributed };
}

export const formatDiamonds = (n) => Math.round(n).toLocaleString("en-US");
