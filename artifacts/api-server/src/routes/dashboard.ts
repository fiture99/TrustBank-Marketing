import { Router, type IRouter } from "express";
import { and, eq, sql } from "drizzle-orm";
import {
  db,
  campaignsTable,
  leadsTable,
  dealsTable,
  interactionsTable,
  usersTable,
  funnelTable,
  monthlyTrendTable,
} from "@workspace/db";
import {
  GetDashboardSummaryQueryParams,
  GetDashboardSummaryResponse,
  GetChannelBreakdownResponse,
  GetMonthlyTrendResponse,
  GetFunnelResponse,
  GetTeamActivityResponse,
  GetRevenueOverviewResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard/summary", async (req, res): Promise<void> => {
  const parsed = GetDashboardSummaryQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const channel = parsed.data.channel;

  const leadConds = [];
  const campConds = [];
  if (channel) {
    leadConds.push(
      sql`${leadsTable.campaignId} IN (SELECT id FROM ${campaignsTable} WHERE ${campaignsTable.channel} = ${channel})`,
    );
    campConds.push(eq(campaignsTable.channel, channel));
  }

  const [{ totalLeads, conversions }] = await db
    .select({
      totalLeads: sql<number>`COUNT(*)::int`,
      conversions: sql<number>`SUM(CASE WHEN ${leadsTable.stage} = 'converted' THEN 1 ELSE 0 END)::int`,
    })
    .from(leadsTable)
    .where(leadConds.length ? and(...leadConds) : undefined);

  const [{ campaignsTotal, campaignsActive, budgetTotal, budgetSpent }] =
    await db
      .select({
        campaignsTotal: sql<number>`COUNT(*)::int`,
        campaignsActive: sql<number>`SUM(CASE WHEN ${campaignsTable.status} = 'active' THEN 1 ELSE 0 END)::int`,
        budgetTotal: sql<number>`COALESCE(SUM(${campaignsTable.budget}),0)::float`,
        budgetSpent: sql<number>`COALESCE(SUM(${campaignsTable.spent}),0)::float`,
      })
      .from(campaignsTable)
      .where(campConds.length ? and(...campConds) : undefined);

  const conversionRate = totalLeads === 0 ? 0 : conversions / totalLeads;
  const budgetUsedPct = budgetTotal === 0 ? 0 : budgetSpent / budgetTotal;

  // Compute deltas vs previous month (simulated from monthly_trend)
  const trend = await db
    .select()
    .from(monthlyTrendTable)
    .orderBy(monthlyTrendTable.month);
  let leadsDelta = 0;
  let conversionsDelta = 0;
  let conversionRateDelta = 0;
  if (trend.length >= 2) {
    const last = trend[trend.length - 1];
    const prev = trend[trend.length - 2];
    leadsDelta = prev.leads === 0 ? 0 : (last.leads - prev.leads) / prev.leads;
    conversionsDelta =
      prev.conversions === 0
        ? 0
        : (last.conversions - prev.conversions) / prev.conversions;
    const lastRate = last.leads === 0 ? 0 : last.conversions / last.leads;
    const prevRate = prev.leads === 0 ? 0 : prev.conversions / prev.leads;
    conversionRateDelta = prevRate === 0 ? 0 : (lastRate - prevRate) / prevRate;
  }

  res.json(
    GetDashboardSummaryResponse.parse({
      totalLeads,
      leadsDelta: round3(leadsDelta),
      conversions,
      conversionsDelta: round3(conversionsDelta),
      conversionRate: round3(conversionRate),
      conversionRateDelta: round3(conversionRateDelta),
      campaignsTotal,
      campaignsActive,
      budgetTotal,
      budgetSpent,
      budgetUsedPct: round3(budgetUsedPct),
    }),
  );
});

function round3(x: number): number {
  return Math.round(x * 1000) / 1000;
}

router.get("/dashboard/channel-breakdown", async (_req, res): Promise<void> => {
  const channels: Array<"digital" | "sms" | "email" | "branch"> = [
    "digital",
    "sms",
    "email",
    "branch",
  ];
  const out = [];
  for (const channel of channels) {
    const [campStats] = await db
      .select({
        budget: sql<number>`COALESCE(SUM(${campaignsTable.budget}),0)::float`,
        spent: sql<number>`COALESCE(SUM(${campaignsTable.spent}),0)::float`,
      })
      .from(campaignsTable)
      .where(eq(campaignsTable.channel, channel));
    const [leadStats] = await db
      .select({
        leads: sql<number>`COUNT(*)::int`,
        conversions: sql<number>`SUM(CASE WHEN ${leadsTable.stage} = 'converted' THEN 1 ELSE 0 END)::int`,
      })
      .from(leadsTable)
      .where(
        sql`${leadsTable.campaignId} IN (SELECT id FROM ${campaignsTable} WHERE ${campaignsTable.channel} = ${channel})`,
      );
    const conversionRate =
      leadStats.leads === 0 ? 0 : leadStats.conversions / leadStats.leads;
    const budgetUsedPct =
      campStats.budget === 0 ? 0 : campStats.spent / campStats.budget;
    out.push({
      channel,
      leads: leadStats.leads,
      conversions: leadStats.conversions,
      conversionRate: round3(conversionRate),
      budgetUsedPct: round3(budgetUsedPct),
      budget: campStats.budget,
      spent: campStats.spent,
    });
  }
  res.json(GetChannelBreakdownResponse.parse(out));
});

router.get("/dashboard/monthly-trend", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(monthlyTrendTable)
    .orderBy(monthlyTrendTable.month);
  res.json(GetMonthlyTrendResponse.parse(rows));
});

router.get("/dashboard/funnel", async (_req, res): Promise<void> => {
  const [base] = await db
    .select()
    .from(funnelTable)
    .where(eq(funnelTable.id, "global"));
  const [{ leads }] = await db
    .select({ leads: sql<number>`COUNT(*)::int` })
    .from(leadsTable);
  const [{ conversions }] = await db
    .select({
      conversions: sql<number>`SUM(CASE WHEN ${leadsTable.stage} = 'converted' THEN 1 ELSE 0 END)::int`,
    })
    .from(leadsTable);
  res.json(
    GetFunnelResponse.parse({
      impressions: base?.impressions ?? 0,
      clicks: base?.clicks ?? 0,
      leads,
      conversions: conversions ?? 0,
    }),
  );
});

router.get("/dashboard/team-activity", async (_req, res): Promise<void> => {
  const users = await db.select().from(usersTable).orderBy(usersTable.id);
  const out = [];
  for (const u of users) {
    const [campRow] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(campaignsTable)
      .where(eq(campaignsTable.ownerId, u.id));
    const [interRow] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(interactionsTable)
      .where(eq(interactionsTable.salesOfficerId, u.id));
    const [leadRow] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(leadsTable)
      .where(eq(leadsTable.assignedToId, u.id));
    const [dealRow] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(dealsTable)
      .where(eq(dealsTable.salesOfficerId, u.id));
    out.push({
      userId: u.id,
      name: u.name,
      role: u.role,
      campaignsCount: campRow.count,
      interactionsCount: interRow.count,
      leadsCount: leadRow.count,
      dealsCount: dealRow.count,
    });
  }
  res.json(GetTeamActivityResponse.parse(out));
});

router.get("/dashboard/revenue", async (_req, res): Promise<void> => {
  const all = await db.select().from(dealsTable);
  const won = all.filter((d) => d.stage === "won");
  const inPipeline = all.filter(
    (d) => d.stage === "prospect" || d.stage === "negotiation",
  );

  const now = new Date();
  const quarterStart = new Date(
    Date.UTC(now.getUTCFullYear(), Math.floor(now.getUTCMonth() / 3) * 3, 1),
  );
  const closedQuarter = won.filter((d) => d.createdAt >= quarterStart);
  const revenueClosedQuarter = closedQuarter.reduce(
    (acc, d) => acc + Number(d.value),
    0,
  );

  // Revenue by month (last 6 months)
  const months: { month: string; revenue: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCMonth(now.getUTCMonth() - i);
    const monthKey = d.toLocaleString("en-US", {
      month: "short",
      year: "numeric",
    });
    const monthRev = won
      .filter(
        (deal) =>
          deal.createdAt.getUTCFullYear() === d.getUTCFullYear() &&
          deal.createdAt.getUTCMonth() === d.getUTCMonth(),
      )
      .reduce((acc, deal) => acc + Number(deal.value), 0);
    months.push({ month: monthKey, revenue: monthRev });
  }

  res.json(
    GetRevenueOverviewResponse.parse({
      revenueClosedQuarter,
      dealsInPipeline: inPipeline.length,
      revenueByMonth: months,
    }),
  );
});

export default router;
