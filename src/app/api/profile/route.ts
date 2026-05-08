import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  calculateBMR,
  calculateTDEE,
  calculateCalorieTarget,
  calculateMacroTargets,
} from "@/lib/calculations";
import { z } from "zod";

const profileSchema = z.object({
  age: z.number().min(10).max(120).optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  heightCm: z.number().min(50).max(300).optional(),
  currentWeight: z.number().min(20).max(700).optional(),
  goalWeight: z.number().min(20).max(700).optional(),
  activityLevel: z
    .enum(["sedentary", "light", "moderate", "active", "very_active"])
    .optional(),
  goal: z
    .enum(["maintain", "lean_bulk", "mild_loss", "moderate_loss", "aggressive_loss"])
    .optional(),
  waterGoal: z.number().int().min(500).max(10000).nullable().optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
  });

  return NextResponse.json(profile);
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = profileSchema.parse(body);

    // Recalculate if enough data is present
    let calculated: {
      bmr?: number;
      tdee?: number;
      calorieTarget?: number;
      proteinTarget?: number;
      carbTarget?: number;
      fatTarget?: number;
    } = {};

    const existing = await prisma.profile.findUnique({
      where: { userId: session.user.id },
    });

    const merged = { ...existing, ...data };

    if (
      merged.currentWeight &&
      merged.heightCm &&
      merged.age &&
      merged.gender &&
      merged.activityLevel &&
      merged.goal
    ) {
      const weightKg = merged.currentWeight * 0.453592;
      const bmr = calculateBMR(
        weightKg,
        merged.heightCm,
        merged.age,
        merged.gender as "male" | "female" | "other"
      );
      const tdee = calculateTDEE(
        bmr,
        merged.activityLevel as
          | "sedentary"
          | "light"
          | "moderate"
          | "active"
          | "very_active"
      );
      const calorieTarget = calculateCalorieTarget(
        tdee,
        merged.goal as
          | "maintain"
          | "lean_bulk"
          | "mild_loss"
          | "moderate_loss"
          | "aggressive_loss"
      );
      const macros = calculateMacroTargets(
        calorieTarget,
        weightKg,
        merged.goal as
          | "maintain"
          | "lean_bulk"
          | "mild_loss"
          | "moderate_loss"
          | "aggressive_loss"
      );
      calculated = {
        bmr: Math.round(bmr),
        tdee,
        calorieTarget,
        proteinTarget: macros.protein,
        carbTarget: macros.carbs,
        fatTarget: macros.fat,
      };
    }

    const profile = await prisma.profile.upsert({
      where: { userId: session.user.id },
      update: { ...data, ...calculated, updatedAt: new Date() },
      create: { userId: session.user.id, ...data, ...calculated },
    });

    return NextResponse.json(profile);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    console.error("Profile error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
