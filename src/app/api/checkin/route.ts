import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { analyzeCheckIn } from "@/lib/checkin";
import { z } from "zod";
import { subDays } from "date-fns";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const uid = session.user.id;
  const since = subDays(new Date(), 30);

  const [profile, weightLogs, foodLogs, pastCheckIns] = await Promise.all([
    prisma.profile.findUnique({ where: { userId: uid } }),
    prisma.weightLog.findMany({
      where: { userId: uid, date: { gte: subDays(new Date(), 21) } },
      orderBy: { date: "asc" },
    }),
    prisma.foodLog.findMany({
      where: { userId: uid, date: { gte: since } },
      include: { entries: true },
      orderBy: { date: "asc" },
    }),
    prisma.weeklyCheckIn.findMany({
      where: { userId: uid },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const calorieTarget = profile?.adaptiveCalories ?? profile?.calorieTarget ?? 2000;
  const tdee = profile?.tdee ?? calorieTarget;
  const goal = profile?.goal ?? "moderate_loss";

  const analysis = analyzeCheckIn({
    weightLogs: weightLogs.map(w => ({ date: new Date(w.date), weight: w.weight })),
    foodLogs: foodLogs.map(l => ({
      date: new Date(l.date),
      calories: l.entries.reduce((s, e) => s + e.calories, 0),
    })),
    pastCheckIns: pastCheckIns.map(c => ({
      createdAt: new Date(c.createdAt),
      recommendation: c.recommendation,
      status: c.status,
    })),
    goal,
    tdee,
    currentCalories: calorieTarget,
  });

  // Last non-refeed check-in (adjustment check-in)
  const lastAdjustmentCheckIn = pastCheckIns.find(
    c => c.recommendation !== "refeed" && c.recommendation !== "insufficient_data"
  );

  const history = pastCheckIns.slice(0, 10).map(c => ({
    id: c.id,
    recommendation: c.recommendation,
    adjustment: c.adjustment,
    reasoning: c.reasoning,
    weeklyChange: c.weeklyChange,
    status: c.status,
    caloriesBefore: c.caloriesBefore,
    caloriesAfter: c.caloriesAfter,
    createdAt: c.createdAt,
  }));

  return NextResponse.json({ analysis, history, lastCheckInDate: lastAdjustmentCheckIn?.createdAt ?? null });
}

const respondSchema = z.object({
  action: z.enum(["adjust", "refeed"]),
  status: z.enum(["accepted", "rejected"]),
  recommendation: z.string(),
  adjustment: z.number().int(),
  reasoning: z.string(),
  weeklyChange: z.number().nullable(),
  expectedChange: z.number(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const uid = session.user.id;
  let body: z.infer<typeof respondSchema>;
  try {
    body = respondSchema.parse(await req.json());
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 });
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const profile = await prisma.profile.findUnique({ where: { userId: uid } });
  const currentCalories = profile?.adaptiveCalories ?? profile?.calorieTarget ?? 2000;

  let caloriesAfter = currentCalories;

  // Apply adjustment if accepted
  if (body.action === "adjust" && body.status === "accepted" && body.adjustment !== 0) {
    caloriesAfter = Math.max(1200, currentCalories + body.adjustment);
    await prisma.profile.update({
      where: { userId: uid },
      data: { adaptiveCalories: caloriesAfter, updatedAt: new Date() },
    });
  }

  await prisma.weeklyCheckIn.create({
    data: {
      userId: uid,
      recommendation: body.recommendation,
      adjustment: body.adjustment,
      reasoning: body.reasoning,
      weeklyChange: body.weeklyChange,
      expectedChange: body.expectedChange,
      status: body.status,
      caloriesBefore: currentCalories,
      caloriesAfter,
    },
  });

  return NextResponse.json({ ok: true, caloriesAfter });
}
