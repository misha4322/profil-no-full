import { Elysia, t } from "elysia";
import { and, eq, inArray, or } from "drizzle-orm";
import { db } from "../db";
import { friendships, users } from "../db/schema";

function isFriendCode(value: string) {
  return /^\d{4}-\d{4}$/i.test(value.trim());
}

async function findTarget(body: { targetId?: string; code?: string }) {
  if (body.targetId) {
    return await db.query.users.findFirst({
      where: eq(users.id, body.targetId),
      columns: {
        id: true,
        username: true,
        avatarUrl: true,
        friendCode: true,
        isProfilePrivate: true,
      },
    });
  }

  if (body.code && isFriendCode(body.code)) {
    return await db.query.users.findFirst({
      where: eq(users.friendCode, body.code.trim().toUpperCase()),
      columns: {
        id: true,
        username: true,
        avatarUrl: true,
        friendCode: true,
        isProfilePrivate: true,
      },
    });
  }

  return null;
}

export const friendsRouter = new Elysia({ prefix: "/friends" })

  .post(
    "/request",
    async ({ body, set }) => {
      const userId = body.userId;
      const target = await findTarget(body);

      if (!target) {
        set.status = 404;
        return { error: "Пользователь не найден" };
      }

      if (userId === target.id) {
        set.status = 400;
        return { error: "Нельзя добавить себя" };
      }

      const accepted = await db.query.friendships.findFirst({
        where: and(
          eq(friendships.status, "accepted"),
          or(
            and(eq(friendships.requesterId, userId), eq(friendships.addresseeId, target.id)),
            and(eq(friendships.requesterId, target.id), eq(friendships.addresseeId, userId))
          )
        ),
        columns: { id: true },
      });

      if (accepted) {
        return { success: true, status: "accepted", target };
      }

      const incoming = await db.query.friendships.findFirst({
        where: and(
          eq(friendships.requesterId, target.id),
          eq(friendships.addresseeId, userId),
          eq(friendships.status, "pending")
        ),
        columns: { id: true },
      });

      if (incoming) {
        return {
          success: true,
          status: "incoming",
          message: "У тебя уже есть входящая заявка от этого пользователя. Нажми «Принять».",
          target,
        };
      }

      const outgoing = await db.query.friendships.findFirst({
        where: and(
          eq(friendships.requesterId, userId),
          eq(friendships.addresseeId, target.id),
          eq(friendships.status, "pending")
        ),
        columns: { id: true },
      });

      if (outgoing) {
        return { success: true, status: "pending", target };
      }

      await db.insert(friendships).values({
        requesterId: userId,
        addresseeId: target.id,
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return { success: true, status: "pending", target };
    },
    {
      body: t.Object({
        userId: t.String(),
        targetId: t.Optional(t.String()),
        code: t.Optional(t.String()),
      }),
    }
  )

  .post(
    "/accept",
    async ({ body, set }) => {
      const row = await db.query.friendships.findFirst({
        where: and(
          eq(friendships.requesterId, body.requesterId),
          eq(friendships.addresseeId, body.userId),
          eq(friendships.status, "pending")
        ),
        columns: { id: true },
      });

      if (!row) {
        set.status = 404;
        return { error: "Заявка не найдена" };
      }

      await db
        .update(friendships)
        .set({ status: "accepted", updatedAt: new Date() })
        .where(eq(friendships.id, row.id));

      return { success: true, status: "accepted" };
    },
    {
      body: t.Object({
        userId: t.String(),
        requesterId: t.String(),
      }),
    }
  )

  .post(
    "/remove",
    async ({ body }) => {
      await db.delete(friendships).where(
        or(
          and(eq(friendships.requesterId, body.userId), eq(friendships.addresseeId, body.targetId)),
          and(eq(friendships.requesterId, body.targetId), eq(friendships.addresseeId, body.userId))
        )
      );

      return { success: true };
    },
    {
      body: t.Object({
        userId: t.String(),
        targetId: t.String(),
      }),
    }
  )

  .get("/requests/:userId", async ({ params }) => {
    const rows = await db.query.friendships.findMany({
      where: and(
        eq(friendships.addresseeId, params.userId),
        eq(friendships.status, "pending")
      ),
      columns: {
        requesterId: true,
        createdAt: true,
      },
    });

    const ids = rows.map((row) => row.requesterId);

    if (!ids.length) {
      return { requests: [] };
    }

    const requestUsers = await db.query.users.findMany({
      where: inArray(users.id, ids),
      columns: {
        id: true,
        username: true,
        avatarUrl: true,
        friendCode: true,
        isProfilePrivate: true,
      },
    });

    return {
      requests: rows.map((row) => ({
        from: requestUsers.find((user) => user.id === row.requesterId)!,
        createdAt: row.createdAt?.toISOString?.() ?? row.createdAt,
      })),
    };
  })

  .get("/list/:userId", async ({ params }) => {
    const rows = await db.query.friendships.findMany({
      where: and(
        eq(friendships.status, "accepted"),
        or(eq(friendships.requesterId, params.userId), eq(friendships.addresseeId, params.userId))
      ),
      columns: {
        requesterId: true,
        addresseeId: true,
      },
    });

    const friendIds = rows.map((row) =>
      row.requesterId === params.userId ? row.addresseeId : row.requesterId
    );

    if (!friendIds.length) {
      return { friends: [] };
    }

    const list = await db.query.users.findMany({
      where: inArray(users.id, friendIds),
      columns: {
        id: true,
        username: true,
        avatarUrl: true,
        friendCode: true,
        isProfilePrivate: true,
      },
    });

    return { friends: list };
  });