import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const foodSchema = z.object({
  name: z.string().min(1).max(200),
  brand: z.string().max(100).optional(),
  calories: z.number().min(0),
  protein: z.number().min(0),
  carbs: z.number().min(0),
  fat: z.number().min(0),
  fiber: z.number().min(0).optional(),
  sodium: z.number().min(0).optional(),
  servingSize: z.number().min(0).default(100),
  servingUnit: z.string().default("g"),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q") ?? "";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 50);

  const foods = await prisma.food.findMany({
    where: {
      name: { contains: query, mode: "insensitive" },
      OR: [{ isCustom: false }, { userId: session.user.id }],
    },
    take: limit,
    orderBy: [{ isCustom: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(foods);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = foodSchema.parse(body);

    const food = await prisma.food.create({
      data: { ...data, isCustom: true, userId: session.user.id },
    });

    return NextResponse.json(food, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
