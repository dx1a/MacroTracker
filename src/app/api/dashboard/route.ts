import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  smoothWeight,
  calculateAdaptiveCalories,
  calculateWeeklyAdherenceScore,
} from "@/lib/calculations";
import { getStreakInfo } from "@/lib/utils";
import { subDays, format } from "date-fns";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const clientDate = searchParams.get("date");
  // Use client's local date if provided (avoids UTC vs local timezone mismatch)
  const todayStr = clientDate && /^\d{4}-\d{2}-\d{2}$/.test(clientDate)
    ? clientDate
    : format(new Date(), "yyyy-MM-dd");
  const today = new Date(todayStr + "T12:00:00Z"); // noon UTC avoids DST edge cases

  const [profile, todayLog, weightLogs, last7DaysLogs, todayWater, lastCheckIn, firstWeight] = await Promise.all([
    prisma.profile.findUnique({ where: { userId: session.user.id } }),
    prisma.foodLog.findUnique({
      where: {
        userId_date: { userId: session.user.id, date: new Date(todayStr) },
      },
      include: { entries: { include: { food: true } } },
    }),
    prisma.weightLog.findMany({
      where: {
        userId: session.user.id,
        date: { gte: subDays(today, 90) },
      },
      orderBy: { date: "asc" },
    }),
    prisma.foodLog.findMany({
      where: {
        userId: session.user.id,
        date: { gte: subDays(today, 7) },
      },
      include: { entries: true },
    }),
    prisma.waterLog.findUnique({
      where: { userId_date: { userId: session.user.id, date: new Date(todayStr) } },
    }),
    prisma.weeklyCheckIn.findFirst({
      where: { userId: session.user.id, recommendation: { not: "insufficient_data" } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.weightLog.findFirst({
      where: { userId: session.user.id },
      orderBy: { date: "asc" },
    }),
  ]);

  // Compute today's macros
  const todayMacros = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    sodium: 0,
  };

  if (todayLog) {
    for (const e of todayLog.entries) {
      todayMacros.calories += e.calories;
      todayMacros.protein += e.protein;
      todayMacros.carbs += e.carbs;
      todayMacros.fat += e.fat;
      todayMacros.fiber += e.fiber ?? 0;
      todayMacros.sodium += e.sodium ?? 0;
    }
  }

  // Weekly averages
  let weeklyTotals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  const daysLogged = last7DaysLogs.length;
  for (const log of last7DaysLogs) {
    for (const e of log.entries) {
      weeklyTotals.calories += e.calories;
      weeklyTotals.protein += e.protein;
      weeklyTotals.carbs += e.carbs;
      weeklyTotals.fat += e.fat;
    }
  }
  const weeklyStats = {
    avgCalories: daysLogged ? Math.round(weeklyTotals.calories / daysLogged) : 0,
    avgProtein: daysLogged ? Math.round(weeklyTotals.protein / daysLogged) : 0,
    avgCarbs: daysLogged ? Math.round(weeklyTotals.carbs / daysLogged) : 0,
    avgFat: daysLogged ? Math.round(weeklyTotals.fat / daysLogged) : 0,
    totalDays: 7,
    daysLogged,
  };

  // Streak
  const logDates = last7DaysLogs
    .map((l) => format(new Date(l.date), "yyyy-MM-dd"))
    .concat(
      (
        await prisma.foodLog.findMany({
          where: { userId: session.user.id },
          select: { date: true },
          orderBy: { date: "desc" },
          take: 60,
        })
      ).map((l) => format(new Date(l.date), "yyyy-MM-dd"))
    );
  const streak = getStreakInfo([...new Set(logDates)]);

  // Adherence score
  const calorieTarget = profile?.adaptiveCalories ?? profile?.calorieTarget ?? 2000;
  const adherenceScore = calculateWeeklyAdherenceScore({
    logs: last7DaysLogs.map((l) => ({
      calories: l.entries.reduce((s, e) => s + e.calories, 0),
      date: new Date(l.date),
    })),
    calorieTarget,
  });

  // Smart suggestions
  const suggestions: string[] = [];
  const avgDiff = weeklyStats.avgCalories - calorieTarget;
  if (Math.abs(avgDiff) > 150) {
    suggestions.push(
      avgDiff > 0
        ? `Your average intake this week exceeded target by ${Math.round(avgDiff)} calories.`
        : `Your average intake this week was ${Math.round(Math.abs(avgDiff))} calories under target.`
    );
  }

  if (weightLogs.length >= 14 && profile?.goal) {
    const adaptive = calculateAdaptiveCalories({
      currentTarget: calorieTarget,
      weightLogs: weightLogs.map((w) => ({
        weight: w.weight,
        date: new Date(w.date),
      })),
      tdee: profile.tdee ?? 2000,
      goal: profile.goal as
        | "maintain"
        | "lean_bulk"
        | "mild_loss"
        | "moderate_loss"
        | "aggressive_loss",
    });
    if (adaptive.reason === "plateau_detected") {
      suggestions.push(
        "Weight trend suggests a plateau. Consider a small calorie reduction or extra cardio."
      );
    } else if (adaptive.reason === "on_track" && weightLogs.length > 7) {
      suggestions.push("Progress remains on pace for your goal. Keep it up!");
    }
  }

  if (weeklyStats.avgProtein < (profile?.proteinTarget ?? 150) * 0.8) {
    suggestions.push(
      "Your protein intake has been low this week. Try adding a high-protein snack."
    );
  }

  // Weight trend
  const recentWeights = weightLogs.slice(-30).map((w) => ({
    id: w.id,
    date: format(new Date(w.date), "yyyy-MM-dd"),
    weight: w.weight,
    note: w.note,
  }));

  const smoothedValues = smoothWeight(recentWeights.map((w) => w.weight));

  // Check-in is due when user has 7+ days of weight data and 7+ days since last check-in
  const daysSinceFirstWeight = firstWeight
    ? Math.floor((Date.now() - new Date(firstWeight.date).getTime()) / 86_400_000)
    : 0;
  const daysSinceLastCheckIn = lastCheckIn
    ? Math.floor((Date.now() - new Date(lastCheckIn.createdAt).getTime()) / 86_400_000)
    : 999;
  const checkInDue = daysSinceFirstWeight >= 7 && daysSinceLastCheckIn >= 7;

  return NextResponse.json({
    todayMacros,
    todayEntries: todayLog?.entries ?? [],
    profile,
    weeklyStats,
    streak,
    adherenceScore,
    suggestions,
    recentWeights: recentWeights.map((w, i) => ({
      ...w,
      smoothed: Math.round(smoothedValues[i] * 10) / 10,
    })),
    todayWaterMl: todayWater?.amount ?? 0,
    checkInDue,
  });
}
