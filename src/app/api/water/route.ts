import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: z.number().int().min(0).max(10000), // ml
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") ?? new Date().toISOString().slice(0, 10);

  const log = await prisma.waterLog.findUnique({
    where: { userId_date: { userId: session.user.id, date: new Date(date) } },
  });

  return NextResponse.json({ amount: log?.amount ?? 0, date });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { date, amount } = schema.parse(body);

    const log = await prisma.waterLog.upsert({
      where: { userId_date: { userId: session.user.id, date: new Date(date) } },
      update: { amount },
      create: { userId: session.user.id, date: new Date(date), amount },
    });

    return NextResponse.json(log);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
