import { Elysia, t } from "elysia";
<<<<<<< HEAD
import { and, eq, inArray, or } from "drizzle-orm";
import { db } from "../db";
import { friendships, users } from "../db/schema";

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error);
}

function isFriendCode(value: string) {
  return /^\d{4}-\d{4}$/i.test(value.trim());
}

async function findTarget(targetId?: string, code?: string) {
  if (targetId) {
    const rows = await db
      .select({
        id: users.id,
        username: users.username,
        avatarUrl: users.avatarUrl,
        friendCode: users.friendCode,
      })
      .from(users)
      .where(eq(users.id, targetId))
      .limit(1);

    return rows[0] ?? null;
  }

  if (code && isFriendCode(code)) {
    const rows = await db
      .select({
        id: users.id,
        username: users.username,
        avatarUrl: users.avatarUrl,
        friendCode: users.friendCode,
      })
      .from(users)
      .where(eq(users.friendCode, code.toUpperCase()))
      .limit(1);

    return rows[0] ?? null;
  }

  return null;
}

export const friendsRouter = new Elysia({ prefix: "/friends" })

  .post(
    "/request",
    async ({ body, set }) => {
      try {
        const userId = body.userId;
        const target = await findTarget(body.targetId, body.code);

        if (!target) {
          set.status = 404;
          return { error: "Пользователь не найден" };
        }

        if (userId === target.id) {
          set.status = 400;
          return { error: "Нельзя добавить себя" };
        }

        const acceptedRows = await db
          .select({ id: friendships.id })
          .from(friendships)
          .where(
            and(
              eq(friendships.status, "accepted"),
              or(
                and(
                  eq(friendships.requesterId, userId),
                  eq(friendships.addresseeId, target.id)
                ),
                and(
                  eq(friendships.requesterId, target.id),
                  eq(friendships.addresseeId, userId)
                )
              )
            )
          )
          .limit(1);

        if (acceptedRows[0]) {
          return { success: true, status: "accepted", target };
        }

        const incomingRows = await db
          .select({ id: friendships.id })
          .from(friendships)
          .where(
            and(
              eq(friendships.requesterId, target.id),
              eq(friendships.addresseeId, userId),
              eq(friendships.status, "pending")
            )
          )
          .limit(1);

        if (incomingRows[0]) {
          return {
            success: true,
            status: "incoming",
            message: "У тебя уже есть входящая заявка от этого пользователя. Нажми «Принять».",
            target,
          };
        }

        const outgoingRows = await db
          .select({ id: friendships.id })
          .from(friendships)
          .where(
            and(
              eq(friendships.requesterId, userId),
              eq(friendships.addresseeId, target.id),
              eq(friendships.status, "pending")
            )
          )
          .limit(1);

        if (outgoingRows[0]) {
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
      } catch (error: unknown) {
        console.error("POST /api/friends/request error:", error);
        set.status = 500;
        return {
          error: "Internal Server Error",
          details:
            process.env.NODE_ENV === "development"
              ? getErrorMessage(error)
              : undefined,
        };
      }
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
      try {
        const rows = await db
          .select({ id: friendships.id })
          .from(friendships)
          .where(
            and(
              eq(friendships.requesterId, body.requesterId),
              eq(friendships.addresseeId, body.userId),
              eq(friendships.status, "pending")
            )
          )
          .limit(1);

        const row = rows[0];

        if (!row) {
          set.status = 404;
          return { error: "Заявка не найдена" };
        }

        await db
          .update(friendships)
          .set({ status: "accepted", updatedAt: new Date() })
          .where(eq(friendships.id, row.id));

        return { success: true, status: "accepted" };
      } catch (error: unknown) {
        console.error("POST /api/friends/accept error:", error);
        set.status = 500;
        return {
          error: "Internal Server Error",
          details:
            process.env.NODE_ENV === "development"
              ? getErrorMessage(error)
              : undefined,
        };
      }
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
    async ({ body, set }) => {
      try {
        await db.delete(friendships).where(
          or(
            and(
              eq(friendships.requesterId, body.userId),
              eq(friendships.addresseeId, body.targetId)
            ),
            and(
              eq(friendships.requesterId, body.targetId),
              eq(friendships.addresseeId, body.userId)
            )
          )
        );

        return { success: true };
      } catch (error: unknown) {
        console.error("POST /api/friends/remove error:", error);
        set.status = 500;
        return {
          error: "Internal Server Error",
          details:
            process.env.NODE_ENV === "development"
              ? getErrorMessage(error)
              : undefined,
        };
      }
    },
    {
      body: t.Object({
        userId: t.String(),
        targetId: t.String(),
      }),
    }
  )

  .get("/requests/:userId", async ({ params, set }) => {
    try {
      const rows = await db
        .select({
          requesterId: friendships.requesterId,
          createdAt: friendships.createdAt,
        })
        .from(friendships)
        .where(
          and(
            eq(friendships.addresseeId, params.userId),
            eq(friendships.status, "pending")
          )
        );

      const ids = rows.map((row) => row.requesterId);

      if (!ids.length) {
        return { requests: [] };
      }

      const requestUsers = await db
        .select({
          id: users.id,
          username: users.username,
          avatarUrl: users.avatarUrl,
          friendCode: users.friendCode,
        })
        .from(users)
        .where(inArray(users.id, ids));

      return {
        requests: rows
          .map((row) => ({
            from: requestUsers.find((user) => user.id === row.requesterId) ?? null,
            createdAt: row.createdAt?.toISOString?.() ?? row.createdAt,
          }))
          .filter((row) => row.from !== null),
      };
    } catch (error: unknown) {
      console.error("GET /api/friends/requests/:userId error:", error);
      set.status = 500;
      return {
        error: "Internal Server Error",
        details:
          process.env.NODE_ENV === "development"
            ? getErrorMessage(error)
            : undefined,
      };
    }
  })

  .get("/list/:userId", async ({ params, set }) => {
    try {
      const rows = await db
        .select({
          requesterId: friendships.requesterId,
          addresseeId: friendships.addresseeId,
        })
        .from(friendships)
        .where(
          and(
            eq(friendships.status, "accepted"),
            or(
              eq(friendships.requesterId, params.userId),
              eq(friendships.addresseeId, params.userId)
            )
          )
        );

      const friendIds = rows.map((row) =>
        row.requesterId === params.userId ? row.addresseeId : row.requesterId
      );

      if (!friendIds.length) {
        return { friends: [] };
      }

      const list = await db
        .select({
          id: users.id,
          username: users.username,
          avatarUrl: users.avatarUrl,
          friendCode: users.friendCode,
          isProfilePrivate: users.isProfilePrivate,
        })
        .from(users)
        .where(inArray(users.id, friendIds));

      return { friends: list };
    } catch (error: unknown) {
      console.error("GET /api/friends/list/:userId error:", error);
      set.status = 500;
      return {
        error: "Internal Server Error",
        details:
          process.env.NODE_ENV === "development"
            ? getErrorMessage(error)
            : undefined,
      };
    }
=======
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
>>>>>>> e55ac280fb05062c9959b150f067539a31286f1d
  });