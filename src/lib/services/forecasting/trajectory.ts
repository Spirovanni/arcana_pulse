export interface TrajectoryPoint {
  year: string;
  baseline: number;
  optimized: number;
  milestone?: string;
}

export interface TrajectoryParams {
  currentSalary: number;
  years: number;
  baseGrowthRate: number; // e.g., 0.04 for 4%
  aiOptimizedGrowthRate: number; // e.g., 0.09 for 9% (base before milestones)
  milestones: { yearOffset: number; label: string; bumpFactor: number }[]; // e.g., bumpFactor 0.20 for a +20% spike
}

/**
 * Mathematically generates a predictive forecast outlining compounded baseline career asset scaling
 * versus AI-Optimized algorithmic pathways.
 */
export function generateCareerTrajectory(params: TrajectoryParams): TrajectoryPoint[] {
  const { currentSalary, years, baseGrowthRate, aiOptimizedGrowthRate, milestones } = params;
  const currentYear = new Date().getFullYear();
  const trajectory: TrajectoryPoint[] = [];

  let currentBase = currentSalary;
  let currentOpt = currentSalary;

  for (let i = 0; i < years; i++) {
    const yearStr = String(currentYear + i);
    
    // Check if the AI path triggers a non-linear milestone jump this year
    const milestoneMatch = milestones.find((m) => m.yearOffset === i);
    let milestoneLabel: string | undefined = undefined;

    if (i > 0) {
       // Standard compounding step
       currentBase = currentBase * (1 + baseGrowthRate);
       
       if (milestoneMatch) {
         // Massive non-linear spike representing a role pivot + baseline compounding
         currentOpt = currentOpt * (1 + aiOptimizedGrowthRate) * (1 + milestoneMatch.bumpFactor);
         milestoneLabel = milestoneMatch.label;
       } else {
         // Standard advanced compounding
         currentOpt = currentOpt * (1 + aiOptimizedGrowthRate);
       }
    } else {
       if (milestoneMatch) milestoneLabel = milestoneMatch.label;
    }

    trajectory.push({
      year: yearStr,
      baseline: Math.round(currentBase),
      optimized: Math.round(currentOpt),
      milestone: milestoneLabel
    });
  }

  return trajectory;
}
