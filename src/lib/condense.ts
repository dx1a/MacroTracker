import { prisma } from "./prisma";

export interface CondenseResult {
  condensed: number;  // number of FoodLog records rolled up this run
  entriesDeleted: number;
  foodsDeleted: number;
}

/**
 * Rolls up FoodLogEntry records older than `daysToKeep` days.
 * Stores daily macro totals on the FoodLog row, then deletes the
 * individual entries and any orphaned isCustom Food rows.
 * Processes at most `batchSize` logs per call so it stays fast.
 */
export async function condenseOldLogs(
  userId: string,
  daysToKeep = 90,
  batchSize = 30,
): Promise<CondenseResult> {
  const cutoff = new Date(Date.now() - daysToKeep * 86_400_000);

  const logs = await prisma.foodLog.findMany({
    where: {
      userId,
      date: { lt: cutoff },
      condensedAt: null,
      entries: { some: {} },
    },
    include: {
      entries: {
        select: { id: true, foodId: true, calories: true, protein: true, carbs: true, fat: true },
      },
    },
    take: batchSize,
  });

  if (logs.length === 0) return { condensed: 0, entriesDeleted: 0, foodsDeleted: 0 };

  let entriesDeleted = 0;
  let foodsDeleted = 0;

  for (const log of logs) {
    const totals = {
      condensedCalories: Math.round(log.entries.reduce((s, e) => s + e.calories, 0)),
      condensedProtein:  Math.round(log.entries.reduce((s, e) => s + e.protein,  0) * 10) / 10,
      condensedCarbs:    Math.round(log.entries.reduce((s, e) => s + e.carbs,    0) * 10) / 10,
      condensedFat:      Math.round(log.entries.reduce((s, e) => s + e.fat,      0) * 10) / 10,
      condensedAt: new Date(),
    };
    const foodIds = log.entries.map(e => e.foodId);

    await prisma.$transaction(async (tx) => {
      // 1. Store condensed totals on the log row
      await tx.foodLog.update({ where: { id: log.id }, data: totals });

      // 2. Delete individual entries
      const deleted = await tx.foodLogEntry.deleteMany({ where: { foodLogId: log.id } });
      entriesDeleted += deleted.count;

      // 3. Delete orphaned isCustom Food rows (no remaining log entries point to them)
      const orphans = await tx.food.findMany({
        where: { id: { in: foodIds }, isCustom: true, logEntries: { none: {} } },
        select: { id: true },
      });
      if (orphans.length > 0) {
        const removed = await tx.food.deleteMany({
          where: { id: { in: orphans.map(f => f.id) } },
        });
        foodsDeleted += removed.count;
      }
    });
  }

  return { condensed: logs.length, entriesDeleted, foodsDeleted };
}
