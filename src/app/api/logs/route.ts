import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const entrySchema = z.object({
  foodId: z.string(),
  meal: z.enum(["breakfast", "lunch", "dinner", "snacks"]),
  servings: z.number().min(0.1).default(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");

  if (!date) {
    // Return last 30 days of logs
    const logs = await prisma.foodLog.findMany({
      where: { userId: session.user.id },
      include: {
        entries: { include: { food: true } },
      },
      orderBy: { date: "desc" },
      take: 30,
    });
    return NextResponse.json(logs);
  }

  const log = await prisma.foodLog.findUnique({
    where: {
      userId_date: {
        userId: session.user.id,
        date: new Date(date),
      },
    },
    include: {
      entries: {
        include: { food: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return NextResponse.json(log);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { foodId, meal, servings, date } = entrySchema.parse(body);

    const food = await prisma.food.findUnique({ where: { id: foodId } });
    if (!food) {
      return NextResponse.json({ error: "Food not found" }, { status: 404 });
    }

    const multiplier = servings / (food.servingSize / 100);
    const entry = {
      foodId,
      meal,
      servings,
      calories: Math.round(food.calories * multiplier * 10) / 10,
      protein: Math.round(food.protein * multiplier * 10) / 10,
      carbs: Math.round(food.carbs * multiplier * 10) / 10,
      fat: Math.round(food.fat * multiplier * 10) / 10,
      fiber: food.fiber ? Math.round(food.fiber * multiplier * 10) / 10 : null,
      sodium: food.sodium ? Math.round(food.sodium * multiplier * 10) / 10 : null,
    };

    const log = await prisma.foodLog.upsert({
      where: {
        userId_date: { userId: session.user.id, date: new Date(date) },
      },
      update: {},
      create: { userId: session.user.id, date: new Date(date) },
    });

    const created = await prisma.foodLogEntry.create({
      data: { foodLogId: log.id, ...entry },
      include: { food: true },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
