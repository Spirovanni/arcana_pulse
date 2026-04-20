// ─── Monte Carlo projection engine ───────────────────────────────────────────
//
// All math runs synchronously in the browser — no API call needed.
// Uses Box-Muller transform to sample normally-distributed monthly returns.

export interface ScenarioPoint {
  month: number;
  pessimistic: number;
  expected: number;
  optimistic: number;
  target: number;
}

export interface MonteCarloResult {
  goalId: string;
  successProbability: number;       // 0–100 %
  expectedCompletionMonth: number | null; // months from now, null if never in range
  suggestedContribution: number;    // monthly amount needed at expected return to hit target on time
  chartData: ScenarioPoint[];
  scenarios: {
    pessimistic: { finalValue: number; returnRate: number };
    expected:    { finalValue: number; returnRate: number };
    optimistic:  { finalValue: number; returnRate: number };
  };
}

// ─── Assumptions ─────────────────────────────────────────────────────────────

const RETURN_ASSUMPTIONS = {
  pessimistic: 0.03,   // 3 % annual
  expected:    0.07,   // 7 % annual (long-run S&P 500 real ≈ 7 %)
  optimistic:  0.10,   // 10 % annual
};

const MONTE_CARLO_SIMULATIONS = 500;
const MONTE_CARLO_ANNUAL_MEAN   = 0.07;
const MONTE_CARLO_ANNUAL_STDDEV = 0.15; // historical S&P 500 annualised vol

// ─── Helpers ──────────────────────────────────────────────────────────────────

function randn(): number {
  // Box-Muller transform
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function growDeterministic(
  start: number,
  monthlyContribution: number,
  months: number,
  annualReturn: number
): number {
  const r = annualReturn / 12;
  if (r === 0) return start + monthlyContribution * months;
  // Future value of lump sum + annuity
  return start * Math.pow(1 + r, months) +
    monthlyContribution * ((Math.pow(1 + r, months) - 1) / r);
}

function buildTrajectory(
  start: number,
  monthlyContribution: number,
  months: number,
  annualReturn: number,
  targetAmount: number,
  step = 1
): ScenarioPoint[] {
  const r = annualReturn / 12;
  const points: ScenarioPoint[] = [];
  for (let m = 0; m <= months; m += step) {
    const value = r === 0
      ? start + monthlyContribution * m
      : start * Math.pow(1 + r, m) + monthlyContribution * ((Math.pow(1 + r, m) - 1) / r);
    points.push({ month: m, pessimistic: 0, expected: 0, optimistic: 0, target: targetAmount, [Object.keys(RETURN_ASSUMPTIONS)[0]]: value });
  }
  return points;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface GoalInput {
  goalId: string;
  currentAmount: number;
  targetAmount: number;
  targetDate: string;          // ISO date string
  monthlyContribution: number;
  linkedInvestmentValue?: number; // optional: adds to currentAmount for projection
}

export function runMonteCarloForGoal(goal: GoalInput): MonteCarloResult {
  const now = new Date();
  const target = new Date(goal.targetDate);
  const totalMonths = Math.max(
    (target.getFullYear() - now.getFullYear()) * 12 +
    (target.getMonth()   - now.getMonth()),
    1
  );

  const start = goal.currentAmount + (goal.linkedInvestmentValue ?? 0);
  const monthly = Math.max(goal.monthlyContribution, 0);
  const targetAmount = goal.targetAmount;

  // ── Deterministic scenarios ───────────────────────────────────────────────

  const step = Math.max(Math.floor(totalMonths / 24), 1); // ≤24 data points
  const months = Array.from({ length: Math.floor(totalMonths / step) + 1 }, (_, i) => i * step);
  if (months[months.length - 1] !== totalMonths) months.push(totalMonths);

  const chartData: ScenarioPoint[] = months.map((m) => ({
    month: m,
    pessimistic: Math.round(growDeterministic(start, monthly, m, RETURN_ASSUMPTIONS.pessimistic)),
    expected:    Math.round(growDeterministic(start, monthly, m, RETURN_ASSUMPTIONS.expected)),
    optimistic:  Math.round(growDeterministic(start, monthly, m, RETURN_ASSUMPTIONS.optimistic)),
    target:      targetAmount,
  }));

  const finalPessimistic = growDeterministic(start, monthly, totalMonths, RETURN_ASSUMPTIONS.pessimistic);
  const finalExpected    = growDeterministic(start, monthly, totalMonths, RETURN_ASSUMPTIONS.expected);
  const finalOptimistic  = growDeterministic(start, monthly, totalMonths, RETURN_ASSUMPTIONS.optimistic);

  // ── Monte Carlo success probability ──────────────────────────────────────

  const monthlyMean   = MONTE_CARLO_ANNUAL_MEAN   / 12;
  const monthlyStddev = MONTE_CARLO_ANNUAL_STDDEV / Math.sqrt(12);
  let successCount = 0;

  for (let s = 0; s < MONTE_CARLO_SIMULATIONS; s++) {
    let value = start;
    for (let m = 0; m < totalMonths; m++) {
      const r = monthlyMean + monthlyStddev * randn();
      value = value * (1 + r) + monthly;
    }
    if (value >= targetAmount) successCount++;
  }

  const successProbability = Math.round((successCount / MONTE_CARLO_SIMULATIONS) * 100);

  // ── Suggested contribution (to hit target at expected return) ─────────────

  const r = RETURN_ASSUMPTIONS.expected / 12;
  const fvFactor = Math.pow(1 + r, totalMonths);
  const annuityFactor = r > 0 ? (fvFactor - 1) / r : totalMonths;
  const remaining = Math.max(targetAmount - start * fvFactor, 0);
  const suggestedContribution = annuityFactor > 0
    ? Math.max(Math.round((remaining / annuityFactor) * 100) / 100, 0)
    : 0;

  // ── Expected completion month (at expected return) ────────────────────────

  let expectedCompletionMonth: number | null = null;
  if (finalExpected >= targetAmount) {
    // Binary search for the first month the expected trajectory crosses the target
    let lo = 0, hi = totalMonths;
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2);
      if (growDeterministic(start, monthly, mid, RETURN_ASSUMPTIONS.expected) >= targetAmount) {
        hi = mid;
      } else {
        lo = mid + 1;
      }
    }
    expectedCompletionMonth = lo;
  }

  return {
    goalId: goal.goalId,
    successProbability,
    expectedCompletionMonth,
    suggestedContribution,
    chartData,
    scenarios: {
      pessimistic: { finalValue: Math.round(finalPessimistic), returnRate: RETURN_ASSUMPTIONS.pessimistic },
      expected:    { finalValue: Math.round(finalExpected),    returnRate: RETURN_ASSUMPTIONS.expected    },
      optimistic:  { finalValue: Math.round(finalOptimistic),  returnRate: RETURN_ASSUMPTIONS.optimistic  },
    },
  };
}

export function runMonteCarloForGoals(goals: GoalInput[]): MonteCarloResult[] {
  return goals.map(runMonteCarloForGoal);
}
