import type { GoalType } from "@/lib/types";

export interface GoalQuestion {
  id: string;
  prompt: string;
  placeholder?: string;
  required?: boolean;
}

export interface GoalTypeConfig {
  label: string;
  description: string;
  questions: GoalQuestion[];
}

export const GOAL_TYPE_CONFIG: Record<GoalType, GoalTypeConfig> = {
  emergency_fund: {
    label: "Emergency Fund",
    description: "Build a safety buffer for unexpected expenses.",
    questions: [
      {
        id: "monthly_expenses",
        prompt: "What are your average monthly essential expenses?",
        placeholder: "e.g. 3200",
        required: true,
      },
      {
        id: "months_buffer",
        prompt: "How many months of expenses do you want to cover?",
        placeholder: "e.g. 6",
        required: true,
      },
      {
        id: "current_emergency_savings",
        prompt: "How much do you already have saved for emergencies?",
        placeholder: "e.g. 1500",
        required: true,
      },
    ],
  },
  debt_payoff: {
    label: "Debt Payoff",
    description: "Eliminate high-interest debt with a focused payoff plan.",
    questions: [
      {
        id: "total_debt",
        prompt: "How much total debt are you paying off?",
        placeholder: "e.g. 24000",
        required: true,
      },
      {
        id: "highest_apr",
        prompt: "What is your highest interest rate (APR)?",
        placeholder: "e.g. 24.99%",
        required: true,
      },
      {
        id: "minimum_payments",
        prompt: "What are your total monthly minimum payments?",
        placeholder: "e.g. 640",
        required: true,
      },
    ],
  },
  home_purchase: {
    label: "Home Purchase",
    description: "Save strategically for a down payment and closing costs.",
    questions: [
      {
        id: "home_price",
        prompt: "What home price range are you targeting?",
        placeholder: "e.g. 450000",
        required: true,
      },
      {
        id: "down_payment_percent",
        prompt: "What down payment percentage are you aiming for?",
        placeholder: "e.g. 20%",
        required: true,
      },
      {
        id: "timeline_notes",
        prompt: "Any timeline constraints or market preferences?",
        placeholder: "e.g. Move by summer 2028 in Austin metro",
      },
    ],
  },
  retirement: {
    label: "Retirement",
    description: "Build long-term assets for retirement security.",
    questions: [
      {
        id: "retirement_age",
        prompt: "At what age do you want to retire?",
        placeholder: "e.g. 60",
        required: true,
      },
      {
        id: "current_retirement_assets",
        prompt: "What is your current retirement balance?",
        placeholder: "e.g. 85000",
        required: true,
      },
      {
        id: "employer_match",
        prompt: "Do you receive an employer match? If yes, how much?",
        placeholder: "e.g. 5% match on 6% contribution",
      },
    ],
  },
  education: {
    label: "Education",
    description: "Fund tuition, courses, certifications, or student needs.",
    questions: [
      {
        id: "education_goal",
        prompt: "What specific education outcome are you funding?",
        placeholder: "e.g. MBA program",
        required: true,
      },
      {
        id: "total_cost_estimate",
        prompt: "What is your estimated total cost?",
        placeholder: "e.g. 70000",
        required: true,
      },
      {
        id: "funding_sources",
        prompt: "Any scholarships, grants, or employer support expected?",
        placeholder: "e.g. Employer reimbursement up to 10k",
      },
    ],
  },
  travel: {
    label: "Travel",
    description: "Plan and save for major trips without financial stress.",
    questions: [
      {
        id: "destination",
        prompt: "Where do you want to travel?",
        placeholder: "e.g. Japan + South Korea",
        required: true,
      },
      {
        id: "trip_length",
        prompt: "How long is the trip?",
        placeholder: "e.g. 18 days",
        required: true,
      },
      {
        id: "cost_categories",
        prompt: "What are your biggest expected costs?",
        placeholder: "e.g. flights, hotels, food, local transport",
      },
    ],
  },
  business_launch: {
    label: "Business Launch",
    description: "Fund startup costs and runway for a new venture.",
    questions: [
      {
        id: "business_type",
        prompt: "What kind of business are you launching?",
        placeholder: "e.g. Digital marketing agency",
        required: true,
      },
      {
        id: "startup_budget",
        prompt: "What is your estimated startup budget?",
        placeholder: "e.g. 30000",
        required: true,
      },
      {
        id: "runway_months",
        prompt: "How many months of personal runway do you want?",
        placeholder: "e.g. 9 months",
      },
    ],
  },
  custom: {
    label: "Custom Goal",
    description: "Create a custom objective and tailored execution plan.",
    questions: [
      {
        id: "objective",
        prompt: "Describe your goal outcome in one sentence.",
        placeholder: "e.g. Save for a major life transition",
        required: true,
      },
      {
        id: "constraints",
        prompt: "What constraints should the plan account for?",
        placeholder: "e.g. Variable income, childcare costs",
      },
      {
        id: "success_metric",
        prompt: "How will you measure success?",
        placeholder: "e.g. Reach 15k in 14 months",
      },
    ],
  },
};
