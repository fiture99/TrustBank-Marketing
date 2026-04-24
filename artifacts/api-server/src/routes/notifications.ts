import { Router, type IRouter } from "express";
import { and, eq, sql, desc } from "drizzle-orm";
import {
  db,
  notificationsTable,
  inboxAlertsTable,
  notificationTemplatesTable,
  usersTable,
  campaignsTable,
} from "@workspace/db";
import {
  ListNotificationsQueryParams,
  ListNotificationsResponse,
  SendNotificationBody,
  ListInboxAlertsResponse,
  MarkInboxAlertReadParams,
  MarkInboxAlertReadResponse,
  ListNotificationTemplatesResponse,
} from "@workspace/api-zod";
import { getCurrentUserId } from "../lib/currentUser";

const router: IRouter = Router();

const audienceCounts: Record<string, number> = {
  all_customers: 12480,
  account_holders: 7320,
  loan_clients: 1240,
  business_customers: 540,
  staff: 24,
  custom: 0,
};

router.get("/notifications", async (req, res): Promise<void> => {
  const parsed = ListNotificationsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const conds = [];
  if (parsed.data.channel)
    conds.push(eq(notificationsTable.channel, parsed.data.channel));
  const limit = parsed.data.limit ?? 50;
  const rows = await db
    .select({
      id: notificationsTable.id,
      channel: notificationsTable.channel,
      recipient: notificationsTable.recipient,
      subject: notificationsTable.subject,
      message: notificationsTable.message,
      status: notificationsTable.status,
      recipientCount: notificationsTable.recipientCount,
      sentByName: usersTable.name,
      campaignName: campaignsTable.name,
      createdAt: notificationsTable.createdAt,
    })
    .from(notificationsTable)
    .leftJoin(usersTable, eq(notificationsTable.sentById, usersTable.id))
    .leftJoin(
      campaignsTable,
      eq(notificationsTable.campaignId, campaignsTable.id),
    )
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(notificationsTable.createdAt))
    .limit(limit);

  res.json(
    ListNotificationsResponse.parse(
      rows.map((r) => ({
        ...r,
        sentByName: r.sentByName ?? "—",
        createdAt: r.createdAt.toISOString(),
      })),
    ),
  );
});

router.post("/notifications/send", async (req, res): Promise<void> => {
  const parsed = SendNotificationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const sentById = await getCurrentUserId();
  const recipientCount =
    parsed.data.audience === "custom"
      ? parsed.data.recipients?.length ?? 0
      : audienceCounts[parsed.data.audience] ?? 0;
  const recipientLabel =
    parsed.data.audience === "custom"
      ? (parsed.data.recipients ?? []).slice(0, 3).join(", ") || "Custom list"
      : audienceLabel(parsed.data.audience);

  const [created] = await db
    .insert(notificationsTable)
    .values({
      channel: parsed.data.channel,
      recipient: recipientLabel,
      subject: parsed.data.subject ?? null,
      message: parsed.data.message,
      status: "sent",
      recipientCount,
      sentById,
      campaignId: parsed.data.campaignId ?? null,
    })
    .returning();

  // For in_app, also write inbox alerts for staff (just the current user as a demo)
  if (parsed.data.channel === "in_app") {
    const staff = await db.select().from(usersTable);
    if (parsed.data.audience === "staff" || parsed.data.audience === "custom") {
      const targets = parsed.data.audience === "custom" ? staff : staff;
      for (const u of targets) {
        await db.insert(inboxAlertsTable).values({
          userId: u.id,
          title: parsed.data.subject ?? "Team announcement",
          body: parsed.data.message,
          category: "system",
        });
      }
    }
  }

  const [withMeta] = await db
    .select({
      id: notificationsTable.id,
      channel: notificationsTable.channel,
      recipient: notificationsTable.recipient,
      subject: notificationsTable.subject,
      message: notificationsTable.message,
      status: notificationsTable.status,
      recipientCount: notificationsTable.recipientCount,
      sentByName: usersTable.name,
      campaignName: campaignsTable.name,
      createdAt: notificationsTable.createdAt,
    })
    .from(notificationsTable)
    .leftJoin(usersTable, eq(notificationsTable.sentById, usersTable.id))
    .leftJoin(
      campaignsTable,
      eq(notificationsTable.campaignId, campaignsTable.id),
    )
    .where(eq(notificationsTable.id, created.id));

  res.status(201).json({
    notification: {
      ...withMeta,
      sentByName: withMeta.sentByName ?? "—",
      createdAt: withMeta.createdAt.toISOString(),
    },
    deliveredCount: recipientCount,
  });
});

function audienceLabel(audience: string): string {
  switch (audience) {
    case "all_customers":
      return "All customers";
    case "account_holders":
      return "Account holders";
    case "loan_clients":
      return "Loan clients";
    case "business_customers":
      return "Business customers";
    case "staff":
      return "All staff";
    default:
      return "Custom recipients";
  }
}

router.get("/notifications/inbox", async (_req, res): Promise<void> => {
  const userId = await getCurrentUserId();
  const rows = await db
    .select()
    .from(inboxAlertsTable)
    .where(eq(inboxAlertsTable.userId, userId))
    .orderBy(desc(inboxAlertsTable.createdAt));
  res.json(
    ListInboxAlertsResponse.parse(
      rows.map((r) => ({
        id: r.id,
        title: r.title,
        body: r.body,
        category: r.category,
        read: r.read,
        createdAt: r.createdAt.toISOString(),
      })),
    ),
  );
});

router.post("/notifications/inbox/:id/read", async (req, res): Promise<void> => {
  const params = MarkInboxAlertReadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [updated] = await db
    .update(inboxAlertsTable)
    .set({ read: true })
    .where(eq(inboxAlertsTable.id, params.data.id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Alert not found" });
    return;
  }
  res.json(
    MarkInboxAlertReadResponse.parse({
      id: updated.id,
      title: updated.title,
      body: updated.body,
      category: updated.category,
      read: updated.read,
      createdAt: updated.createdAt.toISOString(),
    }),
  );
});

router.get("/notifications/templates", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(notificationTemplatesTable)
    .orderBy(notificationTemplatesTable.id);
  res.json(ListNotificationTemplatesResponse.parse(rows));
});

export default router;
