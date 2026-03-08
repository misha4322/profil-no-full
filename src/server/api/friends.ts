import { Elysia, t } from "elysia";
import { db } from "../db";
import { users, friendships } from "../db/schema";
import { and, eq, inArray, or } from "drizzle-orm";

export const friendsRouter = new Elysia({ prefix: "/friends" })

  // ➕ отправить заявку: POST /api/friends/request { userId, targetId }
  .post(
    "/request",
    async ({ body, set }) => {
      const { userId, targetId } = body;

      if (userId === targetId) {
        set.status = 400;
        return { error: "Нельзя добавить себя" };
      }

      const targetExists = await db.query.users.findFirst({
        where: eq(users.id, targetId),
        columns: { id: true },
      });
      if (!targetExists) {
        set.status = 404;
        return { error: "User not found" };
      }

      // уже есть прямое ребро?
      const direct = await db.query.friendships.findFirst({
        where: and(eq(friendships.requesterId, userId), eq(friendships.addresseeId, targetId)),
      });

      if (direct) {
        return { success: true, status: direct.status };
      }

      // если есть обратная заявка pending — можно “автопринять”
      const reverse = await db.query.friendships.findFirst({
        where: and(eq(friendships.requesterId, targetId), eq(friendships.addresseeId, userId)),
      });

      if (reverse?.status === "pending") {
        await db
          .update(friendships)
          .set({ status: "accepted", updatedAt: new Date() })
          .where(eq(friendships.id, reverse.id));
        return { success: true, status: "accepted" };
      }

      await db.insert(friendships).values({
        requesterId: userId,
        addresseeId: targetId,
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return { success: true, status: "pending" };
    },
    {
      body: t.Object({ userId: t.String(), targetId: t.String() }),
    }
  )

  // ✅ принять заявку: POST /api/friends/accept { userId, requesterId }
  .post(
    "/accept",
    async ({ body, set }) => {
      const { userId, requesterId } = body;

      const req = await db.query.friendships.findFirst({
        where: and(
          eq(friendships.requesterId, requesterId),
          eq(friendships.addresseeId, userId),
          eq(friendships.status, "pending")
        ),
        columns: { id: true },
      });

      if (!req) {
        set.status = 404;
        return { error: "Request not found" };
      }

      await db
        .update(friendships)
        .set({ status: "accepted", updatedAt: new Date() })
        .where(eq(friendships.id, req.id));

      return { success: true, status: "accepted" };
    },
    {
      body: t.Object({ userId: t.String(), requesterId: t.String() }),
    }
  )

  // ❌ удалить из друзей/отменить: POST /api/friends/remove { userId, targetId }
  .post(
    "/remove",
    async ({ body }) => {
      const { userId, targetId } = body;

      await db
        .delete(friendships)
        .where(
          or(
            and(eq(friendships.requesterId, userId), eq(friendships.addresseeId, targetId)),
            and(eq(friendships.requesterId, targetId), eq(friendships.addresseeId, userId))
          )
        );

      return { success: true };
    },
    { body: t.Object({ userId: t.String(), targetId: t.String() }) }
  )

  // 📥 входящие заявки: GET /api/friends/requests/:userId
  .get("/requests/:userId", async ({ params }) => {
    const incoming = await db.query.friendships.findMany({
      where: and(eq(friendships.addresseeId, params.userId), eq(friendships.status, "pending")),
      columns: { requesterId: true, createdAt: true },
    });

    const ids = incoming.map((r) => r.requesterId);
    if (!ids.length) return { requests: [] };

    const reqUsers = await db.query.users.findMany({
      where: inArray(users.id, ids),
      columns: { id: true, username: true, avatarUrl: true },
    });

    return {
      requests: incoming.map((r) => ({
        from: reqUsers.find((u) => u.id === r.requesterId)!,
        createdAt: r.createdAt?.toISOString?.() ?? r.createdAt,
      })),
    };
  })

  // 👥 список друзей (accepted): GET /api/friends/list/:userId
  .get("/list/:userId", async ({ params }) => {
    const rows = await db.query.friendships.findMany({
      where: and(
        eq(friendships.status, "accepted"),
        or(eq(friendships.requesterId, params.userId), eq(friendships.addresseeId, params.userId))
      ),
      columns: { requesterId: true, addresseeId: true },
    });

    const friendIds = rows.map((r) =>
      r.requesterId === params.userId ? r.addresseeId : r.requesterId
    );

    if (!friendIds.length) return { friends: [] };

    const list = await db.query.users.findMany({
      where: inArray(users.id, friendIds),
      columns: { id: true, username: true, avatarUrl: true, isProfilePrivate: true },
    });

    return { friends: list };
  });