import { Router, type IRouter } from "express";
import { and, asc, eq, sql } from "drizzle-orm";
import {
  db,
  leadsTable,
  campaignsTable,
  usersTable,
  interactionsTable,
} from "@workspace/db";
import {
  ListLeadsQueryParams,
  ListLeadsResponse,
  ListLeadsResponseItem,
  CreateLeadBody,
  GetLeadParams,
  GetLeadResponse,
  UpdateLeadParams,
  UpdateLeadBody,
  UpdateLeadResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const ownerUsers = usersTable;

async function listLeads(filters: { stage?: string; assignedToId?: number; campaignId?: number }) {
  const conds = [];
  if (filters.stage) conds.push(eq(leadsTable.stage, filters.stage));
  if (filters.assignedToId)
    conds.push(eq(leadsTable.assignedToId, filters.assignedToId));
  if (filters.campaignId)
    conds.push(eq(leadsTable.campaignId, filters.campaignId));

  const rows = await db
    .select({
      id: leadsTable.id,
      name: leadsTable.name,
      phone: leadsTable.phone,
      email: leadsTable.email,
      productInterest: leadsTable.productInterest,
      source: leadsTable.source,
      campaignId: leadsTable.campaignId,
      campaignName: campaignsTable.name,
      assignedToId: leadsTable.assignedToId,
      assignedToName: ownerUsers.name,
      stage: leadsTable.stage,
      createdAt: leadsTable.createdAt,
    })
    .from(leadsTable)
    .leftJoin(campaignsTable, eq(leadsTable.campaignId, campaignsTable.id))
    .leftJoin(ownerUsers, eq(leadsTable.assignedToId, ownerUsers.id))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(sql`${leadsTable.createdAt} DESC`);

  return rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
  }));
}

router.get("/leads", async (req, res): Promise<void> => {
  const parsed = ListLeadsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const data = await listLeads(parsed.data);
  res.json(ListLeadsResponse.parse(data));
});

router.post("/leads", async (req, res): Promise<void> => {
  const parsed = CreateLeadBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [created] = await db
    .insert(leadsTable)
    .values({
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email ?? null,
      productInterest: parsed.data.productInterest,
      source: parsed.data.source,
      campaignId: parsed.data.campaignId ?? null,
      assignedToId: parsed.data.assignedToId ?? null,
      stage: "new",
    })
    .returning();
  const data = await listLeads({});
  const found = data.find((d) => d.id === created.id)!;
  res.status(201).json(ListLeadsResponseItem.parse(found));
});

router.get("/leads/:id", async (req, res): Promise<void> => {
  const params = GetLeadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const data = await listLeads({});
  const lead = data.find((d) => d.id === params.data.id);
  if (!lead) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }
  const interactions = await db
    .select({
      id: interactionsTable.id,
      leadId: interactionsTable.leadId,
      leadName: leadsTable.name,
      type: interactionsTable.type,
      notes: interactionsTable.notes,
      salesOfficerId: interactionsTable.salesOfficerId,
      salesOfficerName: usersTable.name,
      nextFollowUp: interactionsTable.nextFollowUp,
      createdAt: interactionsTable.createdAt,
    })
    .from(interactionsTable)
    .leftJoin(leadsTable, eq(interactionsTable.leadId, leadsTable.id))
    .leftJoin(usersTable, eq(interactionsTable.salesOfficerId, usersTable.id))
    .where(eq(interactionsTable.leadId, params.data.id))
    .orderBy(sql`${interactionsTable.createdAt} DESC`);

  const interactionsOut = interactions.map((i) => ({
    ...i,
    leadName: i.leadName ?? "—",
    salesOfficerName: i.salesOfficerName ?? "—",
    createdAt: i.createdAt.toISOString(),
  }));

  res.json(GetLeadResponse.parse({ ...lead, interactions: interactionsOut }));
});

router.patch("/leads/:id", async (req, res): Promise<void> => {
  const params = UpdateLeadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateLeadBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const update: Record<string, unknown> = {};
  for (const key of [
    "stage",
    "assignedToId",
    "productInterest",
    "email",
    "phone",
    "name",
  ] as const) {
    if (parsed.data[key] !== undefined) update[key] = parsed.data[key];
  }
  const [updated] = await db
    .update(leadsTable)
    .set(update)
    .where(eq(leadsTable.id, params.data.id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }
  const data = await listLeads({});
  const found = data.find((d) => d.id === params.data.id)!;
  res.json(UpdateLeadResponse.parse(found));
});

export default router;
