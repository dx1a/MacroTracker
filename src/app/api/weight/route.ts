import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const weightSchema = z.object({
  weight: z.number().min(50).max(700),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().max(500).optional(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const days = parseInt(searchParams.get("days") ?? "90");

  const since = new Date();
  since.setDate(since.getDate() - days);

  const weights = await prisma.weightLog.findMany({
    where: { userId: session.user.id, date: { gte: since } },
    orderBy: { date: "asc" },
  });

  return NextResponse.json(weights);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { weight, date, note } = weightSchema.parse(body);

    const entry = await prisma.weightLog.upsert({
      where: {
        userId_date: { userId: session.user.id, date: new Date(date) },
      },
      update: { weight, note },
      create: { userId: session.user.id, weight, date: new Date(date), note },
    });

    // Update profile current weight
    await prisma.profile.upsert({
      where: { userId: session.user.id },
      update: { currentWeight: weight },
      create: { userId: session.user.id, currentWeight: weight },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
