export type Meal = "breakfast" | "lunch" | "dinner" | "snacks";

export interface MacroTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sodium?: number;
}

export interface DayLog extends MacroTotals {
  date: string;
  entries: FoodEntry[];
}

export interface FoodEntry {
  id: string;
  foodId: string;
  name: string;
  brand?: string;
  meal: Meal;
  servings: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sodium?: number;
  servingSize: number;
  servingUnit: string;
}

export interface Food {
  id: string;
  name: string;
  brand?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sodium?: number;
  servingSize: number;
  servingUnit: string;
  isCustom: boolean;
}

export interface UserProfile {
  age?: number;
  gender?: string;
  heightCm?: number;
  currentWeight?: number;
  goalWeight?: number;
  activityLevel?: string;
  goal?: string;
  bmr?: number;
  tdee?: number;
  calorieTarget?: number;
  proteinTarget?: number;
  carbTarget?: number;
  fatTarget?: number;
  adaptiveCalories?: number;
  adaptiveAdjustments?: number;
}

export interface WeightEntry {
  id: string;
  date: string;
  weight: number;
  note?: string;
}

export interface DashboardData {
  todayLog: DayLog | null;
  profile: UserProfile | null;
  recentWeights: WeightEntry[];
  weeklyStats: WeeklyStats;
  streak: { current: number; longest: number };
  adherenceScore: number;
  suggestions: string[];
}

export interface WeeklyStats {
  avgCalories: number;
  avgProtein: number;
  avgCarbs: number;
  avgFat: number;
  totalDays: number;
  daysLogged: number;
}

export interface AnalyticsData {
  weightHistory: { date: string; weight: number; smoothed: number }[];
  calorieHistory: { date: string; calories: number; target: number }[];
  macroHistory: { date: string; protein: number; carbs: number; fat: number }[];
  weeklyAdherence: { week: string; score: number }[];
  deficitHistory: { date: string; deficit: number }[];
  projection: { week: number; weight: number }[];
}
