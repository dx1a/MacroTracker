import { create } from "zustand";

interface DashboardState {
  data: DashboardPayload | null;
  loading: boolean;
  error: string | null;
  fetch: () => Promise<void>;
  optimisticAddCalories: (cals: number, protein: number, carbs: number, fat: number) => void;
}

interface DashboardPayload {
  todayMacros: { calories: number; protein: number; carbs: number; fat: number; fiber: number; sodium: number };
  todayEntries: unknown[];
  profile: {
    calorieTarget?: number; proteinTarget?: number; carbTarget?: number; fatTarget?: number;
    adaptiveCalories?: number; goal?: string; currentWeight?: number; goalWeight?: number;
    tdee?: number; gender?: string; activityLevel?: string; waterGoal?: number;
  } | null;
  weeklyStats: { avgCalories: number; avgProtein: number; avgCarbs: number; avgFat: number; totalDays: number; daysLogged: number };
  streak: { current: number; longest: number };
  adherenceScore: number;
  suggestions: string[];
  recentWeights: { id: string; date: string; weight: number; smoothed: number }[];
  todayWaterMl: number;
}

export const useDashboard = create<DashboardState>((set, get) => ({
  data: null,
  loading: false,
  error: null,

  fetch: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch("/api/dashboard");
      if (!res.ok) throw new Error("Failed to load dashboard");
      const data = await res.json();
      set({ data, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  optimisticAddCalories: (cals, protein, carbs, fat) => {
    const current = get().data;
    if (!current) return;
    set({
      data: {
        ...current,
        todayMacros: {
          ...current.todayMacros,
          calories: current.todayMacros.calories + cals,
          protein: current.todayMacros.protein + protein,
          carbs: current.todayMacros.carbs + carbs,
          fat: current.todayMacros.fat + fat,
        },
      },
    });
  },
}));
