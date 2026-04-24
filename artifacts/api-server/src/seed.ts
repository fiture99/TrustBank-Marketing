import {
  db,
  usersTable,
  appStateTable,
  campaignsTable,
  leadsTable,
  interactionsTable,
  dealsTable,
  notificationsTable,
  inboxAlertsTable,
  notificationTemplatesTable,
  funnelTable,
  monthlyTrendTable,
} from "@workspace/db";
const logger = {
  info: (msg: string) => process.stdout.write(`[seed] ${msg}\n`),
  error: (ctx: unknown, msg: string) =>
    process.stderr.write(`[seed] ${msg}: ${JSON.stringify(ctx)}\n`),
};

async function clear() {
  await db.delete(inboxAlertsTable);
  await db.delete(notificationsTable);
  await db.delete(notificationTemplatesTable);
  await db.delete(dealsTable);
  await db.delete(interactionsTable);
  await db.delete(leadsTable);
  await db.delete(campaignsTable);
  await db.delete(appStateTable);
  await db.delete(usersTable);
  await db.delete(funnelTable);
  await db.delete(monthlyTrendTable);
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function seed() {
  logger.info("Clearing database");
  await clear();

  logger.info("Seeding users");
  const users = await db
    .insert(usersTable)
    .values([
      {
        name: "Aminata Jallow",
        email: "aminata@trustbank.gm",
        role: "manager",
        avatarColor: "#1e3a5f",
        title: "Head of Marketing & Sales",
      },
      {
        name: "Modou Ceesay",
        email: "modou@trustbank.gm",
        role: "marketing",
        avatarColor: "#c9a227",
        title: "Senior Marketing Officer",
      },
      {
        name: "Fatou Bah",
        email: "fatou@trustbank.gm",
        role: "marketing",
        avatarColor: "#a23b72",
        title: "Digital Marketing Lead",
      },
      {
        name: "Ebrima Sanyang",
        email: "ebrima@trustbank.gm",
        role: "sales",
        avatarColor: "#2a9d8f",
        title: "Senior Sales Officer",
      },
      {
        name: "Awa Touray",
        email: "awa@trustbank.gm",
        role: "sales",
        avatarColor: "#e76f51",
        title: "Sales Officer",
      },
    ])
    .returning();

  // Set current user to the manager
  await db
    .insert(appStateTable)
    .values({ key: "current_user_id", value: users[0].id });

  logger.info("Seeding campaigns");
  const campaigns = await db
    .insert(campaignsTable)
    .values([
      {
        name: "Q2 Savings Drive",
        channel: "digital",
        startDate: "2026-04-01",
        endDate: "2026-06-30",
        budget: "850000",
        spent: "420000",
        status: "active",
        targetAudience: "Account holders 25-55",
        ownerId: users[1].id,
      },
      {
        name: "Home Loan Promo",
        channel: "branch",
        startDate: "2026-03-15",
        endDate: "2026-05-31",
        budget: "1200000",
        spent: "780000",
        status: "active",
        targetAudience: "Existing customers, salaried",
        ownerId: users[2].id,
      },
      {
        name: "Diaspora Remit Push",
        channel: "sms",
        startDate: "2026-04-01",
        endDate: "2026-04-30",
        budget: "320000",
        spent: "210000",
        status: "active",
        targetAudience: "Diaspora customers (UK/US)",
        ownerId: users[2].id,
      },
      {
        name: "Youth Account Launch",
        channel: "digital",
        startDate: "2026-02-01",
        endDate: "2026-04-15",
        budget: "560000",
        spent: "560000",
        status: "ended",
        targetAudience: "Students 18-25",
        ownerId: users[1].id,
      },
      {
        name: "Business Banking Outreach",
        channel: "email",
        startDate: "2026-04-15",
        endDate: "2026-06-15",
        budget: "420000",
        spent: "120000",
        status: "active",
        targetAudience: "SMEs in Banjul/Serekunda",
        ownerId: users[1].id,
      },
      {
        name: "Ramadan Welcome",
        channel: "sms",
        startDate: "2026-03-01",
        endDate: "2026-04-10",
        budget: "180000",
        spent: "180000",
        status: "ended",
        targetAudience: "All customers",
        ownerId: users[2].id,
      },
    ])
    .returning();

  logger.info("Seeding leads");
  const leadData: Array<{
    name: string;
    phone: string;
    email?: string;
    productInterest: string;
    source: string;
    campaignId: number;
    assignedToId: number;
    stage: string;
    daysAgo: number;
  }> = [
    { name: "Lamin Joof", phone: "+220 770 1102", email: "lamin.joof@example.gm", productInterest: "Savings account", source: "Facebook ad", campaignId: campaigns[0].id, assignedToId: users[3].id, stage: "converted", daysAgo: 3 },
    { name: "Mariama Sowe", phone: "+220 776 4421", email: "mariama@example.gm", productInterest: "Home loan", source: "Branch walk-in", campaignId: campaigns[1].id, assignedToId: users[3].id, stage: "qualified", daysAgo: 5 },
    { name: "Ousman Drammeh", phone: "+220 778 9011", email: "ousman.d@example.gm", productInterest: "Diaspora transfer", source: "SMS", campaignId: campaigns[2].id, assignedToId: users[4].id, stage: "contacted", daysAgo: 2 },
    { name: "Isatou Camara", phone: "+220 779 3322", email: "isatou.c@example.gm", productInterest: "Youth account", source: "Instagram", campaignId: campaigns[3].id, assignedToId: users[4].id, stage: "converted", daysAgo: 8 },
    { name: "Sulayman Bah", phone: "+220 770 5571", productInterest: "Business loan", source: "Email", campaignId: campaigns[4].id, assignedToId: users[3].id, stage: "negotiation" === "negotiation" ? "qualified" : "qualified", daysAgo: 1 },
    { name: "Adama Touray", phone: "+220 772 1185", email: "adama@example.gm", productInterest: "Savings account", source: "Facebook ad", campaignId: campaigns[0].id, assignedToId: users[4].id, stage: "new", daysAgo: 1 },
    { name: "Bakary Manneh", phone: "+220 778 4423", productInterest: "Home loan", source: "Referral", campaignId: campaigns[1].id, assignedToId: users[3].id, stage: "contacted", daysAgo: 4 },
    { name: "Aminata Singhateh", phone: "+220 770 9912", email: "amisingh@example.gm", productInterest: "Mobile banking", source: "Branch", campaignId: campaigns[5].id, assignedToId: users[4].id, stage: "converted", daysAgo: 12 },
    { name: "Yusupha Sallah", phone: "+220 779 6655", productInterest: "Business account", source: "Email", campaignId: campaigns[4].id, assignedToId: users[3].id, stage: "qualified", daysAgo: 6 },
    { name: "Haddy Conteh", phone: "+220 770 4486", email: "haddy.c@example.gm", productInterest: "Diaspora transfer", source: "SMS", campaignId: campaigns[2].id, assignedToId: users[4].id, stage: "lost", daysAgo: 9 },
    { name: "Modou Sambou", phone: "+220 778 3322", productInterest: "Savings", source: "Walk-in", campaignId: campaigns[0].id, assignedToId: users[3].id, stage: "new", daysAgo: 0 },
    { name: "Fatou Njie", phone: "+220 770 8845", email: "fatou.n@example.gm", productInterest: "Home loan", source: "Branch", campaignId: campaigns[1].id, assignedToId: users[3].id, stage: "converted", daysAgo: 14 },
    { name: "Ebrima Touray", phone: "+220 776 1198", productInterest: "Youth account", source: "Instagram", campaignId: campaigns[3].id, assignedToId: users[4].id, stage: "contacted", daysAgo: 7 },
    { name: "Sainey Camara", phone: "+220 779 7732", email: "sainey@example.gm", productInterest: "Business loan", source: "Email", campaignId: campaigns[4].id, assignedToId: users[3].id, stage: "qualified", daysAgo: 3 },
    { name: "Aji Faye", phone: "+220 770 5544", productInterest: "Savings", source: "Facebook", campaignId: campaigns[0].id, assignedToId: users[4].id, stage: "contacted", daysAgo: 2 },
    { name: "Pa Modou Jallow", phone: "+220 776 9923", email: "pamodou@example.gm", productInterest: "Diaspora transfer", source: "SMS", campaignId: campaigns[2].id, assignedToId: users[3].id, stage: "converted", daysAgo: 10 },
    { name: "Ndey Bah", phone: "+220 778 1144", productInterest: "Mobile banking", source: "Branch", campaignId: campaigns[5].id, assignedToId: users[4].id, stage: "new", daysAgo: 1 },
    { name: "Karamba Jobe", phone: "+220 779 8821", productInterest: "Savings", source: "Walk-in", campaignId: campaigns[0].id, assignedToId: users[3].id, stage: "qualified", daysAgo: 4 },
    { name: "Awa Cham", phone: "+220 770 2266", email: "awa.c@example.gm", productInterest: "Home loan", source: "Branch", campaignId: campaigns[1].id, assignedToId: users[3].id, stage: "converted", daysAgo: 18 },
    { name: "Famara Bojang", phone: "+220 776 7733", productInterest: "Business account", source: "Email", campaignId: campaigns[4].id, assignedToId: users[4].id, stage: "new", daysAgo: 0 },
    { name: "Tida Sissoho", phone: "+220 779 4498", email: "tida@example.gm", productInterest: "Diaspora transfer", source: "SMS", campaignId: campaigns[2].id, assignedToId: users[3].id, stage: "contacted", daysAgo: 6 },
    { name: "Saikou Camara", phone: "+220 770 3399", productInterest: "Savings", source: "Facebook", campaignId: campaigns[0].id, assignedToId: users[4].id, stage: "lost", daysAgo: 11 },
  ];

  const insertedLeads = await db
    .insert(leadsTable)
    .values(
      leadData.map((l) => ({
        name: l.name,
        phone: l.phone,
        email: l.email ?? null,
        productInterest: l.productInterest,
        source: l.source,
        campaignId: l.campaignId,
        assignedToId: l.assignedToId,
        stage: l.stage,
        createdAt: daysAgo(l.daysAgo),
      })),
    )
    .returning();

  logger.info("Seeding interactions (with follow-ups)");
  const interactions: Array<{
    leadIdx: number;
    type: string;
    notes: string;
    officerIdx: number;
    nextFollowUp?: string;
    daysAgo: number;
  }> = [
    { leadIdx: 0, type: "call", notes: "Discussed savings options. Customer interested in 5% rate.", officerIdx: 3, daysAgo: 2 },
    { leadIdx: 1, type: "meeting", notes: "Reviewed home loan eligibility. Awaiting payslips.", officerIdx: 3, nextFollowUp: isoDate(daysAgo(-2)), daysAgo: 4 },
    { leadIdx: 2, type: "sms", notes: "Sent diaspora transfer brochure via SMS.", officerIdx: 4, nextFollowUp: isoDate(daysAgo(1)), daysAgo: 1 },
    { leadIdx: 4, type: "call", notes: "Initial business loan call. Owner wants D 2.5M facility.", officerIdx: 3, nextFollowUp: isoDate(daysAgo(-1)), daysAgo: 1 },
    { leadIdx: 6, type: "branch_visit", notes: "Customer visited Banjul branch. Took application form.", officerIdx: 3, nextFollowUp: isoDate(daysAgo(-3)), daysAgo: 3 },
    { leadIdx: 8, type: "email", notes: "Sent business banking proposal.", officerIdx: 3, nextFollowUp: isoDate(daysAgo(2)), daysAgo: 5 },
    { leadIdx: 12, type: "call", notes: "Youth account interest follow-up.", officerIdx: 4, nextFollowUp: isoDate(daysAgo(-5)), daysAgo: 6 },
    { leadIdx: 13, type: "meeting", notes: "Met at branch. Walked through SME current account features.", officerIdx: 3, nextFollowUp: isoDate(daysAgo(-4)), daysAgo: 2 },
    { leadIdx: 17, type: "call", notes: "Confirmed customer KYC docs received.", officerIdx: 3, nextFollowUp: isoDate(daysAgo(0)), daysAgo: 3 },
    { leadIdx: 20, type: "sms", notes: "Reminder SMS sent about transfer fees promo.", officerIdx: 3, nextFollowUp: isoDate(daysAgo(-2)), daysAgo: 5 },
  ];

  await db.insert(interactionsTable).values(
    interactions.map((i) => ({
      leadId: insertedLeads[i.leadIdx].id,
      type: i.type,
      notes: i.notes,
      salesOfficerId: users[i.officerIdx].id,
      nextFollowUp: i.nextFollowUp ?? null,
      createdAt: daysAgo(i.daysAgo),
    })),
  );

  logger.info("Seeding deals");
  const dealData = [
    // Won deals (Q2 closed)
    { customerName: "Lamin Joof", customerPhone: "+220 770 1102", productType: "Savings account", value: "75000", stage: "won", expectedCloseDate: isoDate(daysAgo(2)), salesOfficerId: users[3].id, leadId: insertedLeads[0].id, notes: "Onboarded with starter pack.", daysAgo: 2 },
    { customerName: "Isatou Camara", customerPhone: "+220 779 3322", productType: "Youth account", value: "12000", stage: "won", expectedCloseDate: isoDate(daysAgo(7)), salesOfficerId: users[4].id, leadId: insertedLeads[3].id, notes: "Activated via mobile.", daysAgo: 7 },
    { customerName: "Aminata Singhateh", customerPhone: "+220 770 9912", productType: "Mobile banking package", value: "85000", stage: "won", expectedCloseDate: isoDate(daysAgo(11)), salesOfficerId: users[4].id, leadId: insertedLeads[7].id, notes: "Cross-sell from savings.", daysAgo: 11 },
    { customerName: "Fatou Njie", customerPhone: "+220 770 8845", productType: "Home loan", value: "4200000", stage: "won", expectedCloseDate: isoDate(daysAgo(13)), salesOfficerId: users[3].id, leadId: insertedLeads[11].id, notes: "Disbursed last week.", daysAgo: 13 },
    { customerName: "Pa Modou Jallow", customerPhone: "+220 776 9923", productType: "Diaspora premium", value: "320000", stage: "won", expectedCloseDate: isoDate(daysAgo(9)), salesOfficerId: users[3].id, leadId: insertedLeads[15].id, notes: "Quarterly contract signed.", daysAgo: 9 },
    { customerName: "Awa Cham", customerPhone: "+220 770 2266", productType: "Home loan", value: "5800000", stage: "won", expectedCloseDate: isoDate(daysAgo(17)), salesOfficerId: users[3].id, leadId: insertedLeads[18].id, notes: "Largest deal of quarter.", daysAgo: 17 },

    // Negotiation
    { customerName: "Mariama Sowe", customerPhone: "+220 776 4421", productType: "Home loan", value: "3500000", stage: "negotiation", expectedCloseDate: isoDate(daysAgo(-12)), salesOfficerId: users[3].id, leadId: insertedLeads[1].id, notes: "Awaiting rate approval.", daysAgo: 4 },
    { customerName: "Sulayman Bah", customerPhone: "+220 770 5571", productType: "Business loan", value: "2500000", stage: "negotiation", expectedCloseDate: isoDate(daysAgo(-7)), salesOfficerId: users[3].id, leadId: insertedLeads[4].id, notes: "Reviewing collateral docs.", daysAgo: 1 },
    { customerName: "Yusupha Sallah", customerPhone: "+220 779 6655", productType: "Business account", value: "180000", stage: "negotiation", expectedCloseDate: isoDate(daysAgo(-3)), salesOfficerId: users[3].id, leadId: insertedLeads[8].id, notes: "Final pricing call scheduled.", daysAgo: 5 },
    { customerName: "Sainey Camara", customerPhone: "+220 779 7732", productType: "Business loan", value: "1800000", stage: "negotiation", expectedCloseDate: isoDate(daysAgo(-10)), salesOfficerId: users[3].id, leadId: insertedLeads[13].id, notes: "Term sheet drafted.", daysAgo: 3 },
    { customerName: "Karamba Jobe", customerPhone: "+220 779 8821", productType: "Savings", value: "95000", stage: "negotiation", expectedCloseDate: isoDate(daysAgo(-5)), salesOfficerId: users[3].id, leadId: insertedLeads[17].id, notes: "Comparing rates with competitor.", daysAgo: 4 },

    // Prospect
    { customerName: "Ousman Drammeh", customerPhone: "+220 778 9011", productType: "Diaspora transfer", value: "150000", stage: "prospect", expectedCloseDate: isoDate(daysAgo(-20)), salesOfficerId: users[4].id, leadId: insertedLeads[2].id, notes: "Sent intro deck.", daysAgo: 2 },
    { customerName: "Adama Touray", customerPhone: "+220 772 1185", productType: "Savings account", value: "50000", stage: "prospect", expectedCloseDate: isoDate(daysAgo(-25)), salesOfficerId: users[4].id, leadId: insertedLeads[5].id, notes: "Cold lead from FB campaign.", daysAgo: 1 },
    { customerName: "Bakary Manneh", customerPhone: "+220 778 4423", productType: "Home loan", value: "2800000", stage: "prospect", expectedCloseDate: isoDate(daysAgo(-30)), salesOfficerId: users[3].id, leadId: insertedLeads[6].id, notes: "Referral, awaiting docs.", daysAgo: 4 },
    { customerName: "Ebrima Touray", customerPhone: "+220 776 1198", productType: "Youth account", value: "10000", stage: "prospect", expectedCloseDate: isoDate(daysAgo(-15)), salesOfficerId: users[4].id, leadId: insertedLeads[12].id, notes: "Student inquiry.", daysAgo: 7 },
    { customerName: "Aji Faye", customerPhone: "+220 770 5544", productType: "Savings", value: "65000", stage: "prospect", expectedCloseDate: isoDate(daysAgo(-18)), salesOfficerId: users[4].id, leadId: insertedLeads[14].id, notes: "Followed up via call.", daysAgo: 2 },
    { customerName: "Tida Sissoho", customerPhone: "+220 779 4498", productType: "Diaspora transfer", value: "120000", stage: "prospect", expectedCloseDate: isoDate(daysAgo(-22)), salesOfficerId: users[3].id, leadId: insertedLeads[20].id, notes: "Lives in UK, periodic transfers.", daysAgo: 6 },
    { customerName: "Famara Bojang", customerPhone: "+220 776 7733", productType: "Business account", value: "240000", stage: "prospect", expectedCloseDate: isoDate(daysAgo(-28)), salesOfficerId: users[4].id, leadId: insertedLeads[19].id, notes: "Brand new SME inquiry.", daysAgo: 0 },
    { customerName: "Ndey Bah", customerPhone: "+220 778 1144", productType: "Mobile banking", value: "32000", stage: "prospect", expectedCloseDate: isoDate(daysAgo(-12)), salesOfficerId: users[4].id, leadId: insertedLeads[16].id, notes: "Walk-in inquiry.", daysAgo: 1 },

    // Lost
    { customerName: "Haddy Conteh", customerPhone: "+220 770 4486", productType: "Diaspora transfer", value: "0", stage: "lost", expectedCloseDate: isoDate(daysAgo(8)), salesOfficerId: users[4].id, leadId: insertedLeads[9].id, notes: "Chose competitor (lower fees).", daysAgo: 8 },
    { customerName: "Saikou Camara", customerPhone: "+220 770 3399", productType: "Savings", value: "0", stage: "lost", expectedCloseDate: isoDate(daysAgo(10)), salesOfficerId: users[4].id, leadId: insertedLeads[21].id, notes: "Customer postponed indefinitely.", daysAgo: 10 },
  ];

  await db.insert(dealsTable).values(
    dealData.map((d) => ({
      ...d,
      createdAt: daysAgo(d.daysAgo),
    })),
  );

  logger.info("Seeding notifications");
  await db.insert(notificationsTable).values([
    {
      channel: "sms",
      recipient: "All customers",
      message: "Trust Bank: Q2 Savings Drive — earn up to 5% on new accounts. Visit any branch.",
      status: "sent",
      recipientCount: 12480,
      sentById: users[1].id,
      campaignId: campaigns[0].id,
      createdAt: daysAgo(2),
    },
    {
      channel: "email",
      recipient: "Account holders",
      subject: "Your Q2 statement is ready",
      message: "Dear customer, your Q2 statement is now available in mobile banking.",
      status: "sent",
      recipientCount: 7320,
      sentById: users[2].id,
      createdAt: daysAgo(4),
    },
    {
      channel: "sms",
      recipient: "Diaspora customers",
      message: "Reduced remittance fees this month. Send home for less.",
      status: "sent",
      recipientCount: 1840,
      sentById: users[2].id,
      campaignId: campaigns[2].id,
      createdAt: daysAgo(6),
    },
    {
      channel: "in_app",
      recipient: "All staff",
      subject: "Q2 sales targets",
      message: "Manager has shared updated Q2 sales targets in the team channel.",
      status: "sent",
      recipientCount: 24,
      sentById: users[0].id,
      createdAt: daysAgo(1),
    },
    {
      channel: "email",
      recipient: "Loan clients",
      subject: "Home loan promo extended",
      message: "Our Home Loan Promo has been extended to May 31. Apply via your relationship officer.",
      status: "sent",
      recipientCount: 1240,
      sentById: users[2].id,
      campaignId: campaigns[1].id,
      createdAt: daysAgo(3),
    },
  ]);

  logger.info("Seeding notification templates");
  await db.insert(notificationTemplatesTable).values([
    {
      name: "Welcome SMS",
      channel: "sms",
      subject: null,
      body: "Welcome to Trust Bank, {{name}}! Your account is ready. Reply HELP for support.",
    },
    {
      name: "Statement ready (email)",
      channel: "email",
      subject: "Your statement is ready",
      body: "Dear {{name}}, your latest statement is available in your mobile banking app.",
    },
    {
      name: "Follow-up reminder",
      channel: "sms",
      subject: null,
      body: "Hi {{name}}, just following up on our recent conversation about {{product}}. Let us know how to help.",
    },
    {
      name: "Promo SMS",
      channel: "sms",
      subject: null,
      body: "Trust Bank: {{offer}}. Valid until {{date}}. Visit any branch.",
    },
    {
      name: "Internal announcement",
      channel: "in_app",
      subject: "Team announcement",
      body: "{{body}}",
    },
  ]);

  logger.info("Seeding inbox alerts");
  await db.insert(inboxAlertsTable).values([
    {
      userId: users[0].id,
      title: "3 deals closed this week",
      body: "Sales team closed D 5.65M in deals this week.",
      category: "system",
      read: false,
      createdAt: daysAgo(0),
    },
    {
      userId: users[0].id,
      title: "Q2 Savings Drive update",
      body: "Q2 Savings Drive has reached 49% of budget with 8 conversions.",
      category: "campaign",
      read: false,
      createdAt: daysAgo(1),
    },
    {
      userId: users[0].id,
      title: "Pipeline update",
      body: "5 deals in negotiation totalling D 8.075M.",
      category: "deal",
      read: true,
      createdAt: daysAgo(2),
    },
    {
      userId: users[3].id,
      title: "Follow-up overdue: Mariama Sowe",
      body: "Follow-up scheduled for home loan was due 2 days ago.",
      category: "follow_up",
      read: false,
      createdAt: daysAgo(0),
    },
    {
      userId: users[3].id,
      title: "New lead assigned: Sulayman Bah",
      body: "Business loan inquiry — D 2.5M facility.",
      category: "lead",
      read: false,
      createdAt: daysAgo(1),
    },
    {
      userId: users[4].id,
      title: "Follow-up due today: Ousman Drammeh",
      body: "Diaspora transfer follow-up call scheduled.",
      category: "follow_up",
      read: false,
      createdAt: daysAgo(0),
    },
    {
      userId: users[1].id,
      title: "Campaign over budget alert",
      body: "Home Loan Promo has spent 65% of budget — review pacing.",
      category: "campaign",
      read: false,
      createdAt: daysAgo(0),
    },
  ]);

  logger.info("Seeding funnel + monthly trend");
  await db
    .insert(funnelTable)
    .values({ id: "global", impressions: 128400, clicks: 12240 });
  await db.insert(monthlyTrendTable).values([
    { month: "2026-01", leads: 980, conversions: 142 },
    { month: "2026-02", leads: 1110, conversions: 168 },
    { month: "2026-03", leads: 1245, conversions: 198 },
    { month: "2026-04", leads: 1372, conversions: 232 },
  ]);

  logger.info("Seed complete");
}

seed()
  .then(() => process.exit(0))
  .catch((e) => {
    logger.error({ err: e }, "Seed failed");
    process.exit(1);
  });
