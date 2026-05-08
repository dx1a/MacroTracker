import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "MMM d, yyyy");
}

export function toDateString(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function todayString(): string {
  return toDateString(new Date());
}

export function formatMacro(value: number): string {
  return `${Math.round(value)}g`;
}

export function formatCalories(value: number): string {
  return Math.round(value).toLocaleString();
}

export function macroCalories(protein: number, carbs: number, fat: number): number {
  return Math.round(protein * 4 + carbs * 4 + fat * 9);
}

export function getMealEmoji(meal: string): string {
  const map: Record<string, string> = {
    breakfast: "🌅",
    lunch: "☀️",
    dinner: "🌙",
    snacks: "🍎",
  };
  return map[meal] ?? "🍽️";
}

export function getGoalLabel(goal: string): string {
  const map: Record<string, string> = {
    maintain: "Maintain Weight",
    lean_bulk: "Lean Bulk (+0.25 lb/wk)",
    mild_loss: "Mild Loss (-0.5 lb/wk)",
    moderate_loss: "Moderate Loss (-1 lb/wk)",
    aggressive_loss: "Aggressive Loss (-2 lb/wk)",
  };
  return map[goal] ?? goal;
}

export function getActivityLabel(level: string): string {
  const map: Record<string, string> = {
    sedentary: "Sedentary (office job, no exercise)",
    light: "Light (1-3 days/week)",
    moderate: "Moderate (3-5 days/week)",
    active: "Active (6-7 days/week)",
    very_active: "Very Active (physical job + training)",
  };
  return map[level] ?? level;
}

export function percentOf(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.min(100, Math.round((value / total) * 100));
}

export function calorieDelta(consumed: number, target: number): number {
  return target - consumed;
}

export function getStreakInfo(dates: string[]): { current: number; longest: number } {
  if (dates.length === 0) return { current: 0, longest: 0 };
  const sorted = [...dates].sort();
  let current = 1;
  let longest = 1;
  let streak = 1;

  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
    if (diff === 1) {
      streak++;
      longest = Math.max(longest, streak);
    } else if (diff > 1) {
      streak = 1;
    }
  }

  // Check if streak is current (last log was today or yesterday)
  const lastDate = new Date(sorted[sorted.length - 1]);
  const today = new Date();
  const daysSinceLast =
    (today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
  current = daysSinceLast <= 1 ? streak : 0;

  return { current, longest };
}
