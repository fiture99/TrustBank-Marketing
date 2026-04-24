import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import {
  ListUsersResponse,
  GetCurrentUserResponse,
  SetCurrentUserBody,
  SetCurrentUserResponse,
} from "@workspace/api-zod";
import { getCurrentUserId, setCurrentUserId } from "../lib/currentUser";

const router: IRouter = Router();

router.get("/users", async (_req, res): Promise<void> => {
  const users = await db.select().from(usersTable).orderBy(usersTable.id);
  res.json(ListUsersResponse.parse(users));
});

router.get("/users/me", async (_req, res): Promise<void> => {
  const id = await getCurrentUserId();
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, id));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(GetCurrentUserResponse.parse(user));
});

router.put("/users/me", async (req, res): Promise<void> => {
  const parsed = SetCurrentUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, parsed.data.userId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  await setCurrentUserId(parsed.data.userId);
  res.json(SetCurrentUserResponse.parse(user));
});

export default router;
