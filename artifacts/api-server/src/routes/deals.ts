import { Router, type IRouter } from "express";
import { and, eq, sql } from "drizzle-orm";
import { db, dealsTable, usersTable } from "@workspace/db";
import {
  ListDealsQueryParams,
  ListDealsResponse,
  CreateDealBody,
  ListDealsResponseItem,
  UpdateDealParams,
  UpdateDealBody,
  UpdateDealResponse,
  GetDealPipelineResponse,
} from "@workspace/api-zod";
import { getCurrentUserId } from "../lib/currentUser";

const router: IRouter = Router();

async function listDealsRaw(filters: { stage?: string; salesOfficerId?: number }) {
  const conds = [];
  if (filters.stage) conds.push(eq(dealsTable.stage, filters.stage));
  if (filters.salesOfficerId)
    conds.push(eq(dealsTable.salesOfficerId, filters.salesOfficerId));
  const rows = await db
    .select({
      id: dealsTable.id,
      customerName: dealsTable.customerName,
      customerPhone: dealsTable.customerPhone,
      productType: dealsTable.productType,
      value: dealsTable.value,
      stage: dealsTable.stage,
      expectedCloseDate: dealsTable.expectedCloseDate,
      salesOfficerId: dealsTable.salesOfficerId,
      salesOfficerName: usersTable.name,
      leadId: dealsTable.leadId,
      notes: dealsTable.notes,
      createdAt: dealsTable.createdAt,
    })
    .from(dealsTable)
    .leftJoin(usersTable, eq(dealsTable.salesOfficerId, usersTable.id))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(sql`${dealsTable.createdAt} DESC`);
  return rows.map((r) => ({
    ...r,
    value: Number(r.value),
    salesOfficerName: r.salesOfficerName ?? "—",
    createdAt: r.createdAt.toISOString(),
  }));
}

router.get("/deals", async (req, res): Promise<void> => {
  const parsed = ListDealsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const data = await listDealsRaw(parsed.data);
  res.json(ListDealsResponse.parse(data));
});

router.post("/deals", async (req, res): Promise<void> => {
  const parsed = CreateDealBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const officerId = await getCurrentUserId();
  const [created] = await db
    .insert(dealsTable)
    .values({
      customerName: parsed.data.customerName,
      customerPhone: parsed.data.customerPhone,
      productType: parsed.data.productType,
      value: String(parsed.data.value),
      stage: parsed.data.stage,
      expectedCloseDate: parsed.data.expectedCloseDate,
      salesOfficerId: officerId,
      leadId: parsed.data.leadId ?? null,
      notes: parsed.data.notes ?? null,
    })
    .returning();
  const data = await listDealsRaw({});
  const found = data.find((d) => d.id === created.id)!;
  res.status(201).json(ListDealsResponseItem.parse(found));
});

router.patch("/deals/:id", async (req, res): Promise<void> => {
  const params = UpdateDealParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateDealBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const update: Record<string, unknown> = {};
  if (parsed.data.stage != null) update.stage = parsed.data.stage;
  if (parsed.data.value != null) update.value = String(parsed.data.value);
  if (parsed.data.expectedCloseDate != null)
    update.expectedCloseDate = parsed.data.expectedCloseDate;
  if (parsed.data.notes !== undefined) update.notes = parsed.data.notes;

  const [updated] = await db
    .update(dealsTable)
    .set(update)
    .where(eq(dealsTable.id, params.data.id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Deal not found" });
    return;
  }
  const data = await listDealsRaw({});
  const found = data.find((d) => d.id === params.data.id)!;
  res.json(UpdateDealResponse.parse(found));
});

router.get("/deals/pipeline", async (_req, res): Promise<void> => {
  const all = await listDealsRaw({});
  const stagesArr: ("prospect" | "negotiation" | "won" | "lost")[] = [
    "prospect",
    "negotiation",
    "won",
    "lost",
  ];
  const stages = stagesArr.map((stage) => {
    const items = all.filter((d) => d.stage === stage);
    return {
      stage,
      count: items.length,
      totalValue: items.reduce((acc, x) => acc + x.value, 0),
    };
  });
  const totalValue = stages.reduce((acc, s) => acc + s.totalValue, 0);
  const won = stages.find((s) => s.stage === "won")?.count ?? 0;
  const lost = stages.find((s) => s.stage === "lost")?.count ?? 0;
  const winRate = won + lost === 0 ? 0 : won / (won + lost);

  // Closed this quarter: deals updated to 'won' since first day of current quarter
  const now = new Date();
  const quarterStart = new Date(
    Date.UTC(now.getUTCFullYear(), Math.floor(now.getUTCMonth() / 3) * 3, 1),
  );
  const closedThisQuarter = all.filter(
    (d) => d.stage === "won" && new Date(d.createdAt) >= quarterStart,
  ).length;

  res.json(
    GetDealPipelineResponse.parse({
      stages,
      totalValue,
      winRate: Math.round(winRate * 1000) / 1000,
      closedThisQuarter,
    }),
  );
});

export default router;
