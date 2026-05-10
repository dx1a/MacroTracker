import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  smoothWeight,
  projectWeight,
  calculateWeeklyAdherenceScore,
} from "@/lib/calculations";
import { format, subDays, startOfWeek } from "date-fns";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const days = parseInt(searchParams.get("days") ?? "90");

  const since = subDays(new Date(), days);

  const [profile, weightLogs, foodLogs] = await Promise.all([
    prisma.profile.findUnique({ where: { userId: session.user.id } }),
    prisma.weightLog.findMany({
      where: { userId: session.user.id, date: { gte: since } },
      orderBy: { date: "asc" },
    }),
    prisma.foodLog.findMany({
      where: { userId: session.user.id, date: { gte: since } },
      include: { entries: true },
      orderBy: { date: "asc" },
    }),
  ]);

  const calorieTarget =
    profile?.adaptiveCalories ?? profile?.calorieTarget ?? 2000;
  const tdee = profile?.tdee ?? calorieTarget;

  // Weight history with smoothing
  const weightValues = weightLogs.map((w) => w.weight);
  const smoothed = smoothWeight(weightValues);
  const weightHistory = weightLogs.map((w, i) => ({
    date: format(new Date(w.date), "MMM d"),
    weight: w.weight,
    smoothed: Math.round(smoothed[i] * 10) / 10,
  }));

  // Calorie history
  const calorieHistory = foodLogs.map((log) => ({
    date: format(new Date(log.date), "MMM d"),
    calories: Math.round(
      log.entries.reduce((s, e) => s + e.calories, 0)
    ),
    target: calorieTarget,
  }));

  // Macro history
  const macroHistory = foodLogs.map((log) => ({
    date: format(new Date(log.date), "MMM d"),
    protein: Math.round(log.entries.reduce((s, e) => s + e.protein, 0)),
    carbs: Math.round(log.entries.reduce((s, e) => s + e.carbs, 0)),
    fat: Math.round(log.entries.reduce((s, e) => s + e.fat, 0)),
  }));

  // Deficit/surplus history
  const deficitHistory = foodLogs.map((log) => {
    const consumed = log.entries.reduce((s, e) => s + e.calories, 0);
    return {
      date: format(new Date(log.date), "MMM d"),
      deficit: Math.round(tdee - consumed),
    };
  });

  // Weekly adherence
  const weeklyMap: Record<string, { scores: number[]; date: Date }> = {};
  for (const log of foodLogs) {
    const weekStart = startOfWeek(new Date(log.date), { weekStartsOn: 1 });
    const key = format(weekStart, "yyyy-MM-dd");
    if (!weeklyMap[key]) weeklyMap[key] = { scores: [], date: weekStart };
    const consumed = log.entries.reduce((s, e) => s + e.calories, 0);
    const ratio = consumed / calorieTarget;
    let score = 25;
    if (ratio >= 0.9 && ratio <= 1.1) score = 100;
    else if (ratio >= 0.8 && ratio <= 1.2) score = 75;
    else if (ratio >= 0.7 && ratio <= 1.3) score = 50;
    weeklyMap[key].scores.push(score);
  }

  const weeklyAdherence = Object.entries(weeklyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, { scores, date }]) => ({
      week: format(date, "MMM d"),
      score: Math.round(scores.reduce((s, v) => s + v, 0) / scores.length),
    }));

  // Weight projection
  const currentWeight =
    weightLogs.length > 0
      ? weightLogs[weightLogs.length - 1].weight
      : profile?.currentWeight ?? 170;

  const goalWeeklyMap: Record<string, number> = {
    maintain: 0,
    lean_bulk: 0.25,
    mild_loss: -0.5,
    moderate_loss: -1,
    aggressive_loss: -2,
  };

  const weeklyChange = goalWeeklyMap[profile?.goal ?? "maintain"] ?? 0;
  const projection = projectWeight(currentWeight, weeklyChange, 12);

  return NextResponse.json({
    weightHistory,
    calorieHistory,
    macroHistory,
    deficitHistory,
    weeklyAdherence,
    projection,
  });
}
