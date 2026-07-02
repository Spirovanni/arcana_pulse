import { evaluateAndNotify } from "./hermes";

/**
 * Stub Strategy Engine signal evaluator.
 * When the Strategy Engine is fully implemented, it will call this function when
 * a deployed strategy's entry or exit rules fire.
 */
export async function evaluateStrategySignal(
  workspaceId: string,
  strategyName: string,
  symbol: string,
  signalType: "entry" | "exit",
  label: "educational" | "simulated" | "paper-trading" = "simulated"
): Promise<void> {
  // Wire evaluateAndNotify for the strategy_signal kind
  await evaluateAndNotify(workspaceId, "strategy_signal", {
    symbol,
    strategyName,
    signalType,
    label,
  });
}

/**
 * Helper to trigger risk limit breach alert rule evaluation.
 * Called when a hard control is tripped.
 */
export async function triggerRiskLimitBreachAlert(
  workspaceId: string,
  limitType: string,
  attemptedValue: string | number,
  limitValue: string | number,
  label: "educational" | "simulated" | "paper-trading" = "paper-trading"
): Promise<void> {
  // Wire evaluateAndNotify for the risk_limit_breach kind
  await evaluateAndNotify(workspaceId, "risk_limit_breach", {
    limitType,
    attemptedValue,
    limitValue,
    label,
  });
}
