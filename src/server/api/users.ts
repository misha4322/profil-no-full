import { Elysia, t } from "elysia";
import { db } from "../db";
import { users, friendships } from "../db/schema";
import { and, eq, ilike, or } from "drizzle-orm";

async function getFriendStatus(viewerId: string | null, targetId: string) {
  if (!viewerId) return "none" as const;
  if (viewerId === targetId) return "self" as const;

  const direct = await db.query.friendships.findFirst({
    where: and(eq(friendships.requesterId, viewerId), eq(friendships.addresseeId, targetId)),
    columns: { status: true },
  });

  const reverse = await db.query.friendships.findFirst({
    where: and(eq(friendships.requesterId, targetId), eq(friendships.addresseeId, viewerId)),
    columns: { status: true },
  });

  if (direct?.status === "accepted" || reverse?.status === "accepted") return "friends" as const;
  if (direct?.status === "pending") return "outgoing" as const; // я отправил
  if (reverse?.status === "pending") return "incoming" as const; // мне отправили
  return "none" as const;
}

export const usersRouter = new Elysia({ prefix: "/users" })

  // 🔎 /api/users/search?q=ник
  .get(
    "/search",
    async ({ query }) => {
      const q = (query.q ?? "").trim();
      if (!q) return { users: [] };

      const list = await db.query.users.findMany({
        where: ilike(users.username, `%${q}%`),
        columns: { id: true, username: true, avatarUrl: true, isProfilePrivate: true },
        limit: 20,
      });

      return { users: list };
    },
    {
      query: t.Object({ q: t.Optional(t.String()) }),
    }
  )

  // 👤 /api/users/:id?viewerId=...
  .get(
    "/:id",
    async ({ params, query, set }) => {
      const targetId = params.id;
      const viewerId = query.viewerId ?? null;

      const u = await db.query.users.findFirst({
        where: eq(users.id, targetId),
        columns: {
          id: true,
          username: true,
          avatarUrl: true,
          isProfilePrivate: true,
          createdAt: true,
        },
      });

      if (!u) {
        set.status = 404;
        return { error: "User not found" };
      }

      const friendStatus = await getFriendStatus(viewerId, targetId);
      const canView =
        !u.isProfilePrivate || friendStatus === "friends" || friendStatus === "self";

      // Если закрыт — отдаём “обрезанный” профиль
      if (!canView) {
        return {
          user: {
            id: u.id,
            username: u.username,
            avatarUrl: u.avatarUrl ?? null,
            isProfilePrivate: u.isProfilePrivate,
          },
          friendStatus,
          canView: false,
        };
      }

      // Если можно смотреть — отдаём больше
      return {
        user: {
          id: u.id,
          username: u.username,
          avatarUrl: u.avatarUrl ?? null,
          isProfilePrivate: u.isProfilePrivate,
          createdAt: u.createdAt?.toISOString?.() ?? u.createdAt,
        },
        friendStatus,
        canView: true,
      };
    },
    {
      query: t.Object({ viewerId: t.Optional(t.String()) }),
    }
  )

  // 🔒 смена приватности: POST /api/users/privacy
  .post(
    "/privacy",
    async ({ body, set }) => {
      // как у тебя в лайках: доверяем userId из body (потом можно заменить на auth)
      const updated = await db
        .update(users)
        .set({ isProfilePrivate: body.isProfilePrivate })
        .where(eq(users.id, body.userId))
        .returning({ id: users.id, isProfilePrivate: users.isProfilePrivate });

      if (!updated[0]) {
        set.status = 404;
        return { error: "User not found" };
      }

      return { success: true, user: updated[0] };
    },
    {
      body: t.Object({
        userId: t.String(),
        isProfilePrivate: t.Boolean(),
      }),
    }
  );