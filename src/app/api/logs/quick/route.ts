import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  meal: z.enum(["breakfast", "lunch", "dinner", "snacks"]),
  name: z.string().min(1).max(200).default("Quick Add"),
  calories: z.number().min(0),
  protein: z.number().min(0).default(0),
  carbs: z.number().min(0).default(0),
  fat: z.number().min(0).default(0),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const entry = await prisma.$transaction(async (tx) => {
      // Create a one-off food record owned by this user
      const food = await tx.food.create({
        data: {
          name: data.name,
          calories: data.calories,
          protein: data.protein,
          carbs: data.carbs,
          fat: data.fat,
          servingSize: 1,
          servingUnit: "serving",
          isCustom: true,
          userId: session.user.id,
        },
      });

      // Upsert the day's FoodLog, then attach the entry
      const log = await tx.foodLog.upsert({
        where: { userId_date: { userId: session.user.id, date: new Date(data.date) } },
        update: {},
        create: { userId: session.user.id, date: new Date(data.date) },
      });

      return tx.foodLogEntry.create({
        data: {
          foodLogId: log.id,
          foodId: food.id,
          meal: data.meal,
          servings: 1,
          calories: data.calories,
          protein: data.protein,
          carbs: data.carbs,
          fat: data.fat,
        },
        include: { food: true },
      });
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    console.error("Quick add error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
