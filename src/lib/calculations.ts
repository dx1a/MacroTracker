export type Gender = "male" | "female" | "other";
export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very_active";
export type Goal =
  | "maintain"
  | "lean_bulk"
  | "mild_loss"
  | "moderate_loss"
  | "aggressive_loss";

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.465,
  active: 1.55,
  very_active: 1.725,
};

const GOAL_ADJUSTMENTS: Record<Goal, number> = {
  maintain: 0,
  lean_bulk: 250,
  mild_loss: -250,
  moderate_loss: -500,
  aggressive_loss: -750,
};

const GOAL_WEEKLY_CHANGE: Record<Goal, number> = {
  maintain: 0,
  lean_bulk: 0.25,
  mild_loss: -0.25,
  moderate_loss: -0.5,
  aggressive_loss: -0.75,
};

export function calculateBMR(
  weightKg: number,
  heightCm: number,
  age: number,
  gender: Gender
): number {
  // Mifflin-St Jeor equation
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return gender === "male" ? base + 5 : base - 161;
}

export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[activityLevel]);
}

export function calculateCalorieTarget(tdee: number, goal: Goal): number {
  const target = tdee + GOAL_ADJUSTMENTS[goal];
  // Never below 1200 for safety
  return Math.max(1200, Math.round(target));
}

export function calculateMacroTargets(
  calories: number,
  weightKg: number,
  goal: Goal
) {
  let proteinMultiplier = 2.2; // g per kg bodyweight
  if (goal === "aggressive_loss") proteinMultiplier = 2.5;
  if (goal === "lean_bulk") proteinMultiplier = 2.0;

  const protein = Math.round(weightKg * proteinMultiplier);
  const fat = Math.round((calories * 0.25) / 9);
  const remainingCalories = calories - protein * 4 - fat * 9;
  const carbs = Math.round(Math.max(50, remainingCalories / 4));

  return { protein, carbs, fat };
}

export function calculateTimeline(
  currentWeight: number,
  goalWeight: number,
  goal: Goal
): number | null {
  const weeklyChange = GOAL_WEEKLY_CHANGE[goal];
  if (weeklyChange === 0) return null;
  const totalChange = goalWeight - currentWeight;
  if (
    (totalChange > 0 && weeklyChange < 0) ||
    (totalChange < 0 && weeklyChange > 0)
  )
    return null;
  return Math.abs(Math.round(totalChange / weeklyChange));
}

export function calculateAdaptiveCalories(params: {
  currentTarget: number;
  weightLogs: { weight: number; date: Date }[];
  tdee: number;
  goal: Goal;
}): {
  newTarget: number;
  adjustment: number;
  reason: string;
} {
  const { currentTarget, weightLogs, tdee, goal } = params;
  const MIN_CALORIES = 1200;

  if (weightLogs.length < 14) {
    return { newTarget: currentTarget, adjustment: 0, reason: "insufficient_data" };
  }

  const sorted = [...weightLogs].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const recent = sorted.slice(-14);
  const older = sorted.slice(-28, -14);

  if (older.length < 7) {
    return { newTarget: currentTarget, adjustment: 0, reason: "insufficient_data" };
  }

  const recentAvg = recent.reduce((s, l) => s + l.weight, 0) / recent.length;
  const olderAvg = older.reduce((s, l) => s + l.weight, 0) / older.length;
  const trendKg = recentAvg - olderAvg;
  const expectedWeeklyKg = GOAL_WEEKLY_CHANGE[goal] * 0.453592; // lbs to kg
  const expectedBiweeklyKg = expectedWeeklyKg * 2;
  const TOLERANCE = 0.3; // kg

  const isStagnating =
    Math.abs(trendKg - expectedBiweeklyKg) > TOLERANCE &&
    goal !== "maintain";

  if (!isStagnating) {
    return { newTarget: currentTarget, adjustment: 0, reason: "on_track" };
  }

  // Plateau during a loss goal — reduce calories slightly
  if (
    (goal === "mild_loss" || goal === "moderate_loss" || goal === "aggressive_loss") &&
    trendKg > expectedBiweeklyKg - TOLERANCE
  ) {
    const adjustment = -100;
    const newTarget = Math.max(MIN_CALORIES, currentTarget + adjustment);
    return {
      newTarget,
      adjustment: newTarget - currentTarget,
      reason: "plateau_detected",
    };
  }

  // Bulk not progressing — add a small surplus
  if (goal === "lean_bulk" && trendKg < expectedBiweeklyKg - TOLERANCE) {
    const adjustment = 100;
    const newTarget = Math.min(tdee + 500, currentTarget + adjustment);
    return {
      newTarget,
      adjustment: newTarget - currentTarget,
      reason: "bulk_stagnation",
    };
  }

  return { newTarget: currentTarget, adjustment: 0, reason: "on_track" };
}

export function calculateWeeklyAdherenceScore(params: {
  logs: { calories: number; date: Date }[];
  calorieTarget: number;
}): number {
  const { logs, calorieTarget } = params;
  if (logs.length === 0) return 0;
  const scores = logs.map((log) => {
    const ratio = log.calories / calorieTarget;
    if (ratio >= 0.9 && ratio <= 1.1) return 100;
    if (ratio >= 0.8 && ratio <= 1.2) return 75;
    if (ratio >= 0.7 && ratio <= 1.3) return 50;
    return 25;
  });
  return Math.round(scores.reduce((s, v) => s + v, 0) / scores.length);
}

export function smoothWeight(weights: number[]): number[] {
  if (weights.length === 0) return [];
  const smoothed: number[] = [];
  for (let i = 0; i < weights.length; i++) {
    const start = Math.max(0, i - 3);
    const end = Math.min(weights.length - 1, i + 3);
    const window = weights.slice(start, end + 1);
    smoothed.push(window.reduce((s, v) => s + v, 0) / window.length);
  }
  return smoothed;
}

export function projectWeight(
  currentWeight: number,
  weeklyChangeLbs: number,
  weeks: number
): { week: number; weight: number }[] {
  return Array.from({ length: weeks }, (_, i) => ({
    week: i + 1,
    weight: Math.round((currentWeight + weeklyChangeLbs * (i + 1)) * 10) / 10,
  }));
}

// Returns recommended daily water intake in ml.
// Based on body weight × activity multiplier, adjusted for gender and goal.
export function calculateWaterGoal(
  weightLbs: number,
  gender: string,
  activityLevel: string,
  goal: string
): number {
  const activityOzPerLb: Record<string, number> = {
    sedentary:   0.50,
    light:       0.54,
    moderate:    0.59,
    active:      0.63,
    very_active: 0.67,
  };

  let oz = weightLbs * (activityOzPerLb[activityLevel] ?? 0.55);

  if (gender === "male") oz *= 1.05;
  if (goal === "moderate_loss" || goal === "aggressive_loss") oz *= 1.10;

  const ml = Math.round((oz * 29.5735) / 50) * 50;
  return Math.max(1500, Math.min(5000, ml));
}

export function lbsToKg(lbs: number): number {
  return Math.round(lbs * 0.453592 * 10) / 10;
}

export function kgToLbs(kg: number): number {
  return Math.round(kg * 2.20462 * 10) / 10;
}

export function cmToFtIn(cm: number): string {
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return `${feet}'${inches}"`;
}
