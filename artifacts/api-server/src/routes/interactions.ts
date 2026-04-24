import { Router, type IRouter } from "express";
import { and, eq, sql } from "drizzle-orm";
import {
  db,
  interactionsTable,
  leadsTable,
  usersTable,
  inboxAlertsTable,
} from "@workspace/db";
import {
  ListInteractionsQueryParams,
  ListInteractionsResponse,
  CreateInteractionBody,
  ListInteractionsResponseItem,
  ListFollowUpsDueResponse,
} from "@workspace/api-zod";
import { getCurrentUserId } from "../lib/currentUser";

const router: IRouter = Router();

router.get("/interactions", async (req, res): Promise<void> => {
  const parsed = ListInteractionsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const conds = [];
  if (parsed.data.leadId)
    conds.push(eq(interactionsTable.leadId, parsed.data.leadId));
  if (parsed.data.salesOfficerId)
    conds.push(eq(interactionsTable.salesOfficerId, parsed.data.salesOfficerId));
  const rows = await db
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
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(sql`${interactionsTable.createdAt} DESC`);

  res.json(
    ListInteractionsResponse.parse(
      rows.map((r) => ({
        ...r,
        leadName: r.leadName ?? "—",
        salesOfficerName: r.salesOfficerName ?? "—",
        createdAt: r.createdAt.toISOString(),
      })),
    ),
  );
});

router.post("/interactions", async (req, res): Promise<void> => {
  const parsed = CreateInteractionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const officerId = await getCurrentUserId();
  const [created] = await db
    .insert(interactionsTable)
    .values({
      leadId: parsed.data.leadId,
      type: parsed.data.type,
      notes: parsed.data.notes,
      salesOfficerId: officerId,
      nextFollowUp: parsed.data.nextFollowUp ?? null,
    })
    .returning();

  const [withMeta] = await db
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
    .where(eq(interactionsTable.id, created.id));

  // Emit an in-app alert for the officer about the follow-up if scheduled
  if (parsed.data.nextFollowUp) {
    await db.insert(inboxAlertsTable).values({
      userId: officerId,
      title: "Follow-up scheduled",
      body: `${withMeta.leadName ?? "Lead"} — follow-up on ${parsed.data.nextFollowUp}`,
      category: "follow_up",
    });
  }

  res.status(201).json(
    ListInteractionsResponseItem.parse({
      ...withMeta,
      leadName: withMeta.leadName ?? "—",
      salesOfficerName: withMeta.salesOfficerName ?? "—",
      createdAt: withMeta.createdAt.toISOString(),
    }),
  );
});

router.get("/interactions/follow-ups-due", async (_req, res): Promise<void> => {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const rows = await db
    .select({
      interactionId: interactionsTable.id,
      leadId: interactionsTable.leadId,
      leadName: leadsTable.name,
      leadPhone: leadsTable.phone,
      salesOfficerId: interactionsTable.salesOfficerId,
      salesOfficerName: usersTable.name,
      nextFollowUp: interactionsTable.nextFollowUp,
      notes: interactionsTable.notes,
    })
    .from(interactionsTable)
    .leftJoin(leadsTable, eq(interactionsTable.leadId, leadsTable.id))
    .leftJoin(usersTable, eq(interactionsTable.salesOfficerId, usersTable.id))
    .where(sql`${interactionsTable.nextFollowUp} IS NOT NULL`)
    .orderBy(interactionsTable.nextFollowUp);

  const items = rows
    .filter((r) => r.nextFollowUp)
    .map((r) => {
      const due = new Date(r.nextFollowUp + "T00:00:00Z");
      const daysOverdue = Math.floor(
        (today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24),
      );
      return {
        interactionId: r.interactionId,
        leadId: r.leadId,
        leadName: r.leadName ?? "—",
        leadPhone: r.leadPhone ?? "—",
        salesOfficerId: r.salesOfficerId,
        salesOfficerName: r.salesOfficerName ?? "—",
        nextFollowUp: r.nextFollowUp!,
        daysOverdue,
        notes: r.notes,
      };
    })
    .filter((r) => r.daysOverdue >= -7); // upcoming within a week or overdue

  res.json(ListFollowUpsDueResponse.parse(items));
});

export default router;
