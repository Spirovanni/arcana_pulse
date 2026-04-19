import type { NavItem, Category } from "@/lib/types";

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
  { label: "My Banks", href: "/my-banks", icon: "Landmark" },
  { label: "Transactions", href: "/transactions", icon: "ArrowLeftRight" },
  { label: "Income", href: "/income", icon: "TrendingUp" },
  { label: "Expense", href: "/expense", icon: "TrendingDown" },
  { label: "Transfer Funds", href: "/transfer", icon: "SendHorizontal" },
  { label: "Assistant", href: "/assistant", icon: "MessageCircle" },
  { label: "Notifications", href: "/notifications", icon: "Bell" },
  { label: "Settings", href: "/settings", icon: "Settings" },
];

export const CATEGORY_LABELS: Record<Category, string> = {
  salary: "Salary",
  freelance: "Freelance",
  investment: "Investment",
  refund: "Refund",
  other_income: "Other Income",
  housing: "Housing",
  transportation: "Transportation",
  food: "Food & Dining",
  utilities: "Utilities",
  healthcare: "Healthcare",
  entertainment: "Entertainment",
  shopping: "Shopping",
  education: "Education",
  subscriptions: "Subscriptions",
  travel: "Travel",
  transfer: "Transfer",
  other: "Other",
};

export const TRANSFER_STATUS_LABELS: Record<string, string> = {
  initiated: "Initiated",
  pending: "Pending",
  processing: "Processing",
  posted: "Posted",
  failed: "Failed",
  reversed: "Reversed",
};

export const TRANSACTION_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  posted: "Posted",
  failed: "Failed",
  cancelled: "Cancelled",
};
