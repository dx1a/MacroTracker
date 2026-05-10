export type CheckInRec =
  | "maintain"
  | "cut"
  | "add"
  | "water_weight"
  | "refeed"
  | "insufficient_data";

// Expected lbs change per week, based on calorie deficit applied
const EXPECTED_WEEKLY_LBS: Record<string, number> = {
  maintain:         0,
  lean_bulk:        0.25,
  mild_loss:       -0.5,
  moderate_loss:   -1.0,
  aggressive_loss: -1.5,  // -750 kcal/day × 7 ÷ 3500 kcal/lb
};

export interface CheckInAnalysis {
  recommendation: CheckInRec;
  adjustment: number;           // kcal delta (+ = add, - = cut)
  reasoning: string;            // short title for display
  detail: string;               // full explanation paragraph
  thisWeekAvg: number | null;
  lastWeekAvg: number | null;
  weeklyChange: number | null;  // lbs (negative = losing)
  expectedWeeklyChange: number; // lbs
  currentCalories: number;
  proposedCalories: number;
  isNewUser: boolean;
  daysSinceFirstLog: number;
  refeedSuggested: boolean;
  refeedCalories: number;       // tdee — what to eat on a refeed day
  daysLogged: { thisWeek: number; lastWeek: number };
}

function avg(arr: number[]): number {
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

export function analyzeCheckIn(params: {
  weightLogs: { date: Date; weight: number }[];
  foodLogs: { date: Date; calories: number }[];
  pastCheckIns: { createdAt: Date; recommendation: string; status: string }[];
  goal: string;
  tdee: number;
  currentCalories: number;
}): CheckInAnalysis {
  const { weightLogs, foodLogs, pastCheckIns, goal, tdee, currentCalories } = params;
  const MIN_CALORIES = 1200;
  const isLossGoal = ["mild_loss", "moderate_loss", "aggressive_loss"].includes(goal);
  const isBulkGoal = goal === "lean_bulk";
  const expectedWeeklyChange = EXPECTED_WEEKLY_LBS[goal] ?? 0;

  function noData(reasoning: string, detail: string): CheckInAnalysis {
    return {
      recommendation: "insufficient_data",
      adjustment: 0, reasoning, detail,
      thisWeekAvg: null, lastWeekAvg: null, weeklyChange: null,
      expectedWeeklyChange, currentCalories, proposedCalories: currentCalories,
      isNewUser: true, daysSinceFirstLog: 0,
      refeedSuggested: false, refeedCalories: tdee,
      daysLogged: { thisWeek: 0, lastWeek: 0 },
    };
  }

  if (weightLogs.length < 3) {
    return noData(
      "Not enough data yet",
      "Log your weight at least 2–3 times per week for 2 weeks to unlock check-in analysis."
    );
  }

  const sorted = [...weightLogs].sort((a, b) => +new Date(a.date) - +new Date(b.date));
  const now = new Date();
  const daysSinceFirstLog = Math.floor((+now - +new Date(sorted[0].date)) / 86_400_000);
  const isNewUser = daysSinceFirstLog < 21;

  const d7  = new Date(+now - 7  * 86_400_000);
  const d14 = new Date(+now - 14 * 86_400_000);

  const thisWeekLogs = sorted.filter(l => new Date(l.date) >= d7);
  const lastWeekLogs = sorted.filter(l => new Date(l.date) >= d14 && new Date(l.date) < d7);
  const daysLogged = { thisWeek: thisWeekLogs.length, lastWeek: lastWeekLogs.length };

  if (thisWeekLogs.length === 0 || lastWeekLogs.length === 0) {
    return noData(
      "Need two weeks of data",
      "Log weight at least once in the past 7 days and at least once in the 7 days before that to compare weeks."
    );
  }

  const thisWeekAvg = avg(thisWeekLogs.map(l => l.weight));
  const lastWeekAvg = avg(lastWeekLogs.map(l => l.weight));
  const weeklyChange = thisWeekAvg - lastWeekAvg; // negative = losing

  // ── Early water weight phase: inform only, no adjustments ──────────────────
  if (isNewUser && daysSinceFirstLog < 14) {
    const drop = lastWeekAvg - thisWeekAvg;
    return {
      recommendation: "water_weight",
      adjustment: 0,
      reasoning: "Early water weight phase",
      detail: drop > 2
        ? `You dropped ${drop.toFixed(1)} lbs — a great start! Most of this is water weight (from glycogen and sodium reduction), which is completely normal in weeks 1–2. Your true fat-loss rate will stabilise over the coming weeks. No adjustments needed yet.`
        : `You're only ${daysSinceFirstLog} days in. Early weeks often show irregular changes from water weight. Keep logging and check back soon for a clear picture.`,
      thisWeekAvg, lastWeekAvg, weeklyChange,
      expectedWeeklyChange, currentCalories, proposedCalories: currentCalories,
      isNewUser, daysSinceFirstLog,
      refeedSuggested: false, refeedCalories: tdee, daysLogged,
    };
  }

  // ── Refeed eligibility (loss goals only) ───────────────────────────────────
  const lastRefeed = [...pastCheckIns]
    .filter(c => c.recommendation === "refeed" && c.status === "accepted")
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))[0];
  const daysSinceRefeed = lastRefeed
    ? Math.floor((+now - +new Date(lastRefeed.createdAt)) / 86_400_000)
    : 999;

  const recentFoodLogs = foodLogs.filter(l => new Date(l.date) >= d14);
  const hasConsistentDeficit =
    recentFoodLogs.length >= 10 &&
    avg(recentFoodLogs.map(l => l.calories)) < tdee * 0.92;

  const refeedSuggested =
    isLossGoal &&
    daysSinceFirstLog >= 14 &&
    daysSinceRefeed > 14 &&
    hasConsistentDeficit &&
    weeklyChange < 0; // must actually be losing

  // ── Loss goal analysis ─────────────────────────────────────────────────────
  if (isLossGoal) {
    const absExp = Math.abs(expectedWeeklyChange);
    const absAct = Math.abs(weeklyChange);
    const isGaining  = weeklyChange > 0.3;
    const isStalling = !isGaining && absAct < absExp * 0.4 && !isNewUser;
    const isTooFast  = absAct > absExp * 1.75 && absAct > 0.8;

    if (isGaining) {
      const proposed = Math.max(MIN_CALORIES, currentCalories - 150);
      const delta = proposed - currentCalories;
      return {
        recommendation: "cut",
        adjustment: delta,
        reasoning: `Scale up ${weeklyChange.toFixed(1)} lbs this week`,
        detail: `Your weight went up ${weeklyChange.toFixed(1)} lbs. This could be water retention, high sodium, or a real surplus. A ${Math.abs(delta)} kcal reduction gets you back on track. Reject this if you think it's temporary (time of month, salty meal, extra carbs).`,
        thisWeekAvg, lastWeekAvg, weeklyChange,
        expectedWeeklyChange, currentCalories, proposedCalories: proposed,
        isNewUser, daysSinceFirstLog,
        refeedSuggested: false, refeedCalories: tdee, daysLogged,
      };
    }

    if (isStalling) {
      const proposed = Math.max(MIN_CALORIES, currentCalories - 125);
      const delta = proposed - currentCalories;
      return {
        recommendation: "cut",
        adjustment: delta,
        reasoning: `Progress slowing (${weeklyChange >= 0 ? "+" : ""}${weeklyChange.toFixed(2)} lbs vs ${expectedWeeklyChange.toFixed(1)} expected)`,
        detail: `Expected ~${absExp} lbs loss but saw only ${absAct.toFixed(1)} lbs. A ${Math.abs(delta)} kcal reduction should restart progress. Reject this if you've been under unusual stress or had poor sleep — both cause temporary water retention.`,
        thisWeekAvg, lastWeekAvg, weeklyChange,
        expectedWeeklyChange, currentCalories, proposedCalories: proposed,
        isNewUser, daysSinceFirstLog,
        refeedSuggested: false, refeedCalories: tdee, daysLogged,
      };
    }

    if (isTooFast) {
      const proposed = Math.min(tdee - 100, currentCalories + 150);
      const delta = proposed - currentCalories;
      if (delta > 0) {
        return {
          recommendation: "add",
          adjustment: delta,
          reasoning: `Losing faster than target (${weeklyChange.toFixed(1)} lbs/wk)`,
          detail: `You lost ${absAct.toFixed(1)} lbs — great work — but that's faster than your ${Math.abs(expectedWeeklyChange)} lbs/week goal. Adding ${delta} kcal helps protect muscle mass and makes the plan more sustainable. Reject this if you want to keep the faster pace.`,
          thisWeekAvg, lastWeekAvg, weeklyChange,
          expectedWeeklyChange, currentCalories, proposedCalories: proposed,
          isNewUser, daysSinceFirstLog,
          refeedSuggested, refeedCalories: tdee, daysLogged,
        };
      }
    }

    // On track — may still suggest refeed
    return {
      recommendation: "maintain",
      adjustment: 0,
      reasoning: `On track · ${weeklyChange.toFixed(1)} lbs this week`,
      detail: `You lost ${Math.abs(weeklyChange).toFixed(1)} lbs this week — right on pace for your goal. No calorie changes needed.`,
      thisWeekAvg, lastWeekAvg, weeklyChange,
      expectedWeeklyChange, currentCalories, proposedCalories: currentCalories,
      isNewUser, daysSinceFirstLog,
      refeedSuggested, refeedCalories: tdee, daysLogged,
    };
  }

  // ── Lean bulk analysis ─────────────────────────────────────────────────────
  if (isBulkGoal) {
    const absExp = Math.abs(expectedWeeklyChange);
    const isLosing = weeklyChange < -0.25;
    const isTooFast = weeklyChange > absExp * 2.0;

    if (isLosing) {
      const proposed = Math.min(tdee + 400, currentCalories + 150);
      const delta = proposed - currentCalories;
      return {
        recommendation: "add",
        adjustment: delta,
        reasoning: `Losing weight on a lean bulk`,
        detail: `You're down ${Math.abs(weeklyChange).toFixed(1)} lbs this week — you need a surplus to build muscle. Adding ${delta} kcal puts you back in a proper lean bulk.`,
        thisWeekAvg, lastWeekAvg, weeklyChange,
        expectedWeeklyChange, currentCalories, proposedCalories: proposed,
        isNewUser, daysSinceFirstLog,
        refeedSuggested: false, refeedCalories: tdee, daysLogged,
      };
    }

    if (isTooFast) {
      const proposed = Math.max(MIN_CALORIES, currentCalories - 100);
      const delta = proposed - currentCalories;
      return {
        recommendation: "cut",
        adjustment: delta,
        reasoning: `Gaining too fast (+${weeklyChange.toFixed(1)} lbs/wk)`,
        detail: `Gaining ${weeklyChange.toFixed(1)} lbs/week is more than the lean bulk target of ~${absExp} lbs. Reducing ${Math.abs(delta)} kcal keeps the gain lean and minimises fat accumulation.`,
        thisWeekAvg, lastWeekAvg, weeklyChange,
        expectedWeeklyChange, currentCalories, proposedCalories: proposed,
        isNewUser, daysSinceFirstLog,
        refeedSuggested: false, refeedCalories: tdee, daysLogged,
      };
    }

    return {
      recommendation: "maintain",
      adjustment: 0,
      reasoning: `Lean bulk on track (+${weeklyChange.toFixed(1)} lbs)`,
      detail: `Gaining ${weeklyChange.toFixed(1)} lbs this week — right on schedule. No changes needed.`,
      thisWeekAvg, lastWeekAvg, weeklyChange,
      expectedWeeklyChange, currentCalories, proposedCalories: currentCalories,
      isNewUser, daysSinceFirstLog,
      refeedSuggested: false, refeedCalories: tdee, daysLogged,
    };
  }

  // ── Maintain goal ──────────────────────────────────────────────────────────
  return {
    recommendation: "maintain",
    adjustment: 0,
    reasoning: `Weight ${weeklyChange >= 0 ? "+" : ""}${weeklyChange.toFixed(1)} lbs`,
    detail: Math.abs(weeklyChange) < 0.5
      ? "Weight is stable — great job maintaining!"
      : `Weight shifted ${weeklyChange.toFixed(1)} lbs this week. Small fluctuations under 0.5 lbs are normal. Consider a small calorie adjustment if this direction continues.`,
    thisWeekAvg, lastWeekAvg, weeklyChange,
    expectedWeeklyChange, currentCalories, proposedCalories: currentCalories,
    isNewUser, daysSinceFirstLog,
    refeedSuggested: false, refeedCalories: tdee, daysLogged,
  };
}
