import { Router, type IRouter } from "express";
import { and, eq, sql } from "drizzle-orm";
import {
  db,
  campaignsTable,
  leadsTable,
  usersTable,
} from "@workspace/db";
import {
  ListCampaignsQueryParams,
  ListCampaignsResponse,
  CreateCampaignBody,
  GetCampaignResponse,
  GetCampaignParams,
  UpdateCampaignParams,
  UpdateCampaignBody,
  UpdateCampaignResponse,
  DeleteCampaignParams,
} from "@workspace/api-zod";
import { getCurrentUserId } from "../lib/currentUser";

const router: IRouter = Router();

async function listCampaignsWithStats(filters: { channel?: string; status?: string }) {
  const conditions = [];
  if (filters.channel) conditions.push(eq(campaignsTable.channel, filters.channel));
  if (filters.status) conditions.push(eq(campaignsTable.status, filters.status));

  const rows = await db
    .select({
      id: campaignsTable.id,
      name: campaignsTable.name,
      channel: campaignsTable.channel,
      startDate: campaignsTable.startDate,
      endDate: campaignsTable.endDate,
      budget: campaignsTable.budget,
      spent: campaignsTable.spent,
      status: campaignsTable.status,
      targetAudience: campaignsTable.targetAudience,
      ownerId: campaignsTable.ownerId,
      ownerName: usersTable.name,
      leadsGenerated: sql<number>`(SELECT COUNT(*) FROM ${leadsTable} WHERE ${leadsTable.campaignId} = ${campaignsTable.id})::int`,
      conversions: sql<number>`(SELECT COUNT(*) FROM ${leadsTable} WHERE ${leadsTable.campaignId} = ${campaignsTable.id} AND ${leadsTable.stage} = 'converted')::int`,
    })
    .from(campaignsTable)
    .leftJoin(usersTable, eq(campaignsTable.ownerId, usersTable.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(campaignsTable.id);

  return rows.map((r) => ({
    ...r,
    budget: Number(r.budget),
    spent: Number(r.spent),
    ownerName: r.ownerName ?? "—",
  }));
}

router.get("/campaigns", async (req, res): Promise<void> => {
  const parsed = ListCampaignsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const data = await listCampaignsWithStats(parsed.data);
  res.json(ListCampaignsResponse.parse(data));
});

router.post("/campaigns", async (req, res): Promise<void> => {
  const parsed = CreateCampaignBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const ownerId = await getCurrentUserId();
  const [created] = await db
    .insert(campaignsTable)
    .values({
      name: parsed.data.name,
      channel: parsed.data.channel,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate ?? null,
      budget: String(parsed.data.budget),
      spent: "0",
      status: parsed.data.status,
      targetAudience: parsed.data.targetAudience,
      ownerId,
    })
    .returning();
  const [withStats] = await listCampaignsWithStats({}).then((rows) =>
    rows.filter((r) => r.id === created.id),
  );
  res.status(201).json(GetCampaignResponse.parse(withStats));
});

router.get("/campaigns/:id", async (req, res): Promise<void> => {
  const params = GetCampaignParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const rows = await listCampaignsWithStats({});
  const found = rows.find((r) => r.id === params.data.id);
  if (!found) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }
  res.json(GetCampaignResponse.parse(found));
});

router.patch("/campaigns/:id", async (req, res): Promise<void> => {
  const params = UpdateCampaignParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateCampaignBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const update: Record<string, unknown> = {};
  if (parsed.data.name != null) update.name = parsed.data.name;
  if (parsed.data.channel != null) update.channel = parsed.data.channel;
  if (parsed.data.endDate !== undefined) update.endDate = parsed.data.endDate;
  if (parsed.data.budget != null) update.budget = String(parsed.data.budget);
  if (parsed.data.spent != null) update.spent = String(parsed.data.spent);
  if (parsed.data.status != null) update.status = parsed.data.status;
  if (parsed.data.targetAudience != null)
    update.targetAudience = parsed.data.targetAudience;

  const [updated] = await db
    .update(campaignsTable)
    .set(update)
    .where(eq(campaignsTable.id, params.data.id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }
  const rows = await listCampaignsWithStats({});
  const found = rows.find((r) => r.id === params.data.id)!;
  res.json(UpdateCampaignResponse.parse(found));
});

router.delete("/campaigns/:id", async (req, res): Promise<void> => {
  const params = DeleteCampaignParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [deleted] = await db
    .delete(campaignsTable)
    .where(eq(campaignsTable.id, params.data.id))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
