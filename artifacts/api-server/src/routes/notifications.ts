import { Router, type IRouter } from "express";
import { and, eq, desc, isNotNull, inArray } from "drizzle-orm";
import {
  db,
  notificationsTable,
  inboxAlertsTable,
  notificationTemplatesTable,
  usersTable,
  campaignsTable,
  leadsTable,
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
import { sendBulkSms, isSmsConfigured } from "../lib/sms";
import { logger } from "../lib/logger";

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

  // Resolve recipient list (phone numbers / emails) per channel + audience.
  const phoneNumbers = await resolveRecipients(parsed.data);

  let deliveredCount = 0;
  let failedCount = 0;
  let status: "sent" | "partial" | "failed" = "sent";
  let providerNote = "";

  if (parsed.data.channel === "sms") {
    if (!isSmsConfigured()) {
      res.status(503).json({
        error:
          "SMS provider is not configured. Add DATASLING_SMS_USERNAME, DATASLING_SMS_PASSWORD, DATASLING_SMS_BEARER_TOKEN and DATASLING_SMS_SENDER to artifacts/api-server/.env then restart the API.",
      });
      return;
    }
    if (phoneNumbers.length === 0) {
      res.status(400).json({
        error:
          "No recipients to send to. For SMS, pick the 'custom' audience and provide phone numbers, or use 'staff' / a customer audience to target leads with phones on file.",
      });
      return;
    }

    const results = await sendBulkSms(phoneNumbers, parsed.data.message);
    deliveredCount = results.filter((r) => r.success).length;
    failedCount = results.length - deliveredCount;
    if (failedCount === 0) status = "sent";
    else if (deliveredCount === 0) status = "failed";
    else status = "partial";

    const firstError = results.find((r) => !r.success);
    if (firstError) {
      providerNote = ` · ${failedCount} failed (${firstError.errorMessage ?? firstError.errorCode ?? "unknown"})`;
    }
    logger.info(
      { deliveredCount, failedCount, attempted: results.length },
      "SMS bulk send complete",
    );
  } else {
    // email and in_app remain logged-only for now
    deliveredCount =
      parsed.data.audience === "custom"
        ? parsed.data.recipients?.length ?? 0
        : audienceCounts[parsed.data.audience] ?? 0;
  }

  const recipientLabel =
    parsed.data.audience === "custom"
      ? `${phoneNumbers.length} custom recipients`
      : audienceLabel(parsed.data.audience);

  const [created] = await db
    .insert(notificationsTable)
    .values({
      channel: parsed.data.channel,
      recipient: recipientLabel + providerNote,
      subject: parsed.data.subject ?? null,
      message: parsed.data.message,
      status,
      recipientCount: deliveredCount,
      sentById,
      campaignId: parsed.data.campaignId ?? null,
    })
    .returning();

  // For in_app, also write inbox alerts for staff
  if (parsed.data.channel === "in_app") {
    const staff = await db.select().from(usersTable);
    for (const u of staff) {
      await db.insert(inboxAlertsTable).values({
        userId: u.id,
        title: parsed.data.subject ?? "Team announcement",
        body: parsed.data.message,
        category: "system",
      });
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
    deliveredCount,
    failedCount,
  });
});

async function resolveRecipients(data: {
  channel: "sms" | "email" | "in_app";
  audience: string;
  recipients?: string[];
}): Promise<string[]> {
  if (data.audience === "custom") {
    return (data.recipients ?? []).map((r) => r.trim()).filter(Boolean);
  }

  if (data.channel === "sms") {
    if (data.audience === "staff") {
      // No phone column on users yet — staff broadcasts must go via custom recipients.
      return [];
    }
    // For any customer audience, target leads with a phone on file.
    const stages = audienceLeadStages(data.audience);
    const rows = await db
      .select({ phone: leadsTable.phone })
      .from(leadsTable)
      .where(stages.length ? inArray(leadsTable.stage, stages) : isNotNull(leadsTable.phone));
    return rows.map((r) => r.phone).filter((p): p is string => Boolean(p));
  }

  return [];
}

function audienceLeadStages(audience: string): Array<"new" | "contacted" | "qualified" | "converted" | "lost"> {
  switch (audience) {
    case "account_holders":
      return ["converted"];
    case "loan_clients":
      return ["converted", "qualified"];
    case "business_customers":
      return ["qualified", "converted"];
    case "all_customers":
    default:
      return [];
  }
}

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

router.get("/notifications/provider-status", async (_req, res): Promise<void> => {
  res.json({
    sms: { configured: isSmsConfigured(), provider: "DataSling Bulk SMS" },
    email: { configured: false, provider: "Outlook (pending setup)" },
    in_app: { configured: true, provider: "Trust Bank inbox" },
  });
});

router.get("/notifications/templates", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(notificationTemplatesTable)
    .orderBy(notificationTemplatesTable.id);
  res.json(ListNotificationTemplatesResponse.parse(rows));
});

export default router;
