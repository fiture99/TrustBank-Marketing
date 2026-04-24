import { db, appStateTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const CURRENT_USER_KEY = "current_user_id";

export async function getCurrentUserId(): Promise<number> {
  const [row] = await db
    .select()
    .from(appStateTable)
    .where(eq(appStateTable.key, CURRENT_USER_KEY));

  if (row?.value != null) return row.value;

  const [firstUser] = await db
    .select()
    .from(usersTable)
    .orderBy(usersTable.id)
    .limit(1);
  if (!firstUser) throw new Error("No users seeded");
  await setCurrentUserId(firstUser.id);
  return firstUser.id;
}

export async function setCurrentUserId(userId: number): Promise<void> {
  const existing = await db
    .select()
    .from(appStateTable)
    .where(eq(appStateTable.key, CURRENT_USER_KEY));
  if (existing.length === 0) {
    await db
      .insert(appStateTable)
      .values({ key: CURRENT_USER_KEY, value: userId });
  } else {
    await db
      .update(appStateTable)
      .set({ value: userId })
      .where(eq(appStateTable.key, CURRENT_USER_KEY));
  }
}
