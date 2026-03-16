import { Elysia, t } from "elysia";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "../db";
import { comments, friendships, posts, users } from "../db/schema";

const nullableString = t.Union([t.String(), t.Null()]);

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function isFriendCode(value: string) {
  return /^\d{4}-\d{4}$/i.test(value.trim());
}

function normalizeUsername(value: string) {
  return value.trim().replace(/\s+/g, " ").slice(0, 32);
}

function isValidUsername(value: string) {
  if (value.length < 3 || value.length > 32) return false;
  return /^[\p{L}\p{N} _.-]+$/u.test(value);
}

async function generateFriendCode() {
  while (true) {
    const code = `${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(
      1000 + Math.random() * 9000
    )}`;

    const exists = await db.query.users.findFirst({
      where: eq(users.friendCode, code),
      columns: { id: true },
    });

    if (!exists) return code;
  }
}

async function ensureFriendCode(userId: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { id: true, friendCode: true },
  });

  if (!user) return null;
  if (user.friendCode) return user.friendCode;

  const newCode = await generateFriendCode();

  await db.update(users).set({ friendCode: newCode }).where(eq(users.id, userId));

  return newCode;
}

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
  if (direct?.status === "pending") return "outgoing" as const;
  if (reverse?.status === "pending") return "incoming" as const;

  return "none" as const;
}

async function getUserCounts(userId: string) {
  const [postsRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(posts)
    .where(eq(posts.authorId, userId));

  const [commentsRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(comments)
    .where(eq(comments.authorId, userId));

  const [friendsRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(friendships)
    .where(
      and(
        eq(friendships.status, "accepted"),
        or(eq(friendships.requesterId, userId), eq(friendships.addresseeId, userId))
      )
    );

  return {
    posts: Number(postsRow?.count ?? 0),
    comments: Number(commentsRow?.count ?? 0),
    friends: Number(friendsRow?.count ?? 0),
  };
}

async function getRecentPosts(userId: string) {
  const list = await db.query.posts.findMany({
    where: and(eq(posts.authorId, userId), eq(posts.isPublished, true)),
    orderBy: [desc(posts.createdAt)],
    columns: {
      id: true,
      slug: true,
      title: true,
      coverImage: true,
      createdAt: true,
    },
    limit: 6,
  });

  return list.map((post) => ({
    ...post,
    coverImage: post.coverImage ?? null,
    createdAt: post.createdAt?.toISOString?.() ?? post.createdAt,
  }));
}

export const usersRouter = new Elysia({ prefix: "/users" })

  .get(
    "/search",
    async ({ query }) => {
      const q = String(query.q ?? "").trim();
      const viewerId = query.viewerId ? String(query.viewerId) : null;

      if (!q) return { users: [] };

      const normalizedCode = q.toUpperCase();
      const conditions: any[] = [ilike(users.username, `%${q}%`)];

      if (isUuid(q)) {
        conditions.push(eq(users.id, q));
      }

      if (isFriendCode(normalizedCode)) {
        conditions.push(eq(users.friendCode, normalizedCode));
      }

      const list = await db.query.users.findMany({
        where: conditions.length === 1 ? conditions[0] : or(...conditions),
        columns: {
          id: true,
          username: true,
          avatarUrl: true,
          friendCode: true,
          isProfilePrivate: true,
          createdAt: true,
        },
        limit: 20,
      });

      const result = await Promise.all(
        list.map(async (user) => {
          const friendStatus = await getFriendStatus(viewerId, user.id);
          const canView =
            !user.isProfilePrivate || friendStatus === "friends" || friendStatus === "self";

          return {
            id: user.id,
            username: user.username,
            avatarUrl: user.avatarUrl ?? null,
            friendCode: user.friendCode ?? null,
            isProfilePrivate: user.isProfilePrivate,
            createdAt: user.createdAt?.toISOString?.() ?? user.createdAt,
            friendStatus,
            canView,
          };
        })
      );

      return { users: result };
    },
    {
      query: t.Object({
        q: t.Optional(t.String()),
        viewerId: t.Optional(t.String()),
      }),
    }
  )

  .get("/me/:userId", async ({ params, set }) => {
    const me = await db.query.users.findFirst({
      where: eq(users.id, params.userId),
      columns: {
        id: true,
        username: true,
        email: true,
        avatarUrl: true,
        friendCode: true,
        isProfilePrivate: true,
        createdAt: true,
      },
    });

    if (!me) {
      set.status = 404;
      return { error: "User not found" };
    }

    const friendCode = await ensureFriendCode(me.id);
    const counts = await getUserCounts(me.id);
    const recentPosts = await getRecentPosts(me.id);

    return {
      user: {
        ...me,
        avatarUrl: me.avatarUrl ?? null,
        friendCode,
        createdAt: me.createdAt?.toISOString?.() ?? me.createdAt,
      },
      counts,
      recentPosts,
    };
  })

  .patch(
    "/me",
    async ({ body, set }) => {
      const userId = body.userId;

      const target = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: { id: true, username: true },
      });

      if (!target) {
        set.status = 404;
        return { error: "User not found" };
      }

      const patch: Record<string, unknown> = {};
      const has = (key: string) => Object.prototype.hasOwnProperty.call(body, key);

      if (has("username")) {
        const username = normalizeUsername(String(body.username ?? ""));

        if (!isValidUsername(username)) {
          set.status = 400;
          return {
            error: "Ник: 3–32 символа. Можно буквы, цифры, пробел, _, -, .",
          };
        }

        const existing = await db.query.users.findFirst({
          where: eq(users.username, username),
          columns: { id: true },
        });

        if (existing && existing.id !== userId) {
          set.status = 409;
          return { error: "Этот ник уже занят" };
        }

        patch.username = username;
      }

      if (has("avatarUrl")) {
        patch.avatarUrl = body.avatarUrl ?? null;
      }

      if (has("isProfilePrivate")) {
        patch.isProfilePrivate = !!body.isProfilePrivate;
      }

      if (!Object.keys(patch).length) {
        set.status = 400;
        return { error: "Nothing to update" };
      }

      const updated = await db
        .update(users)
        .set(patch)
        .where(eq(users.id, userId))
        .returning({
          id: users.id,
          username: users.username,
          email: users.email,
          avatarUrl: users.avatarUrl,
          friendCode: users.friendCode,
          isProfilePrivate: users.isProfilePrivate,
          createdAt: users.createdAt,
        });

      return {
        success: true,
        user: {
          ...updated[0],
          avatarUrl: updated[0].avatarUrl ?? null,
          friendCode: updated[0].friendCode ?? null,
          createdAt: updated[0].createdAt?.toISOString?.() ?? updated[0].createdAt,
        },
      };
    },
    {
      body: t.Object({
        userId: t.String(),
        username: t.Optional(t.String()),
        avatarUrl: t.Optional(nullableString),
        isProfilePrivate: t.Optional(t.Boolean()),
      }),
    }
  )

  .post(
    "/me/friend-code/regenerate",
    async ({ body, set }) => {
      const target = await db.query.users.findFirst({
        where: eq(users.id, body.userId),
        columns: { id: true },
      });

      if (!target) {
        set.status = 404;
        return { error: "User not found" };
      }

      const newCode = await generateFriendCode();

      await db.update(users).set({ friendCode: newCode }).where(eq(users.id, body.userId));

      return {
        success: true,
        friendCode: newCode,
      };
    },
    {
      body: t.Object({
        userId: t.String(),
      }),
    }
  )

  .get(
    "/:id",
    async ({ params, query, set }) => {
      const targetId = params.id;
      const viewerId = query.viewerId ? String(query.viewerId) : null;

      const user = await db.query.users.findFirst({
        where: eq(users.id, targetId),
        columns: {
          id: true,
          username: true,
          avatarUrl: true,
          friendCode: true,
          isProfilePrivate: true,
          createdAt: true,
        },
      });

      if (!user) {
        set.status = 404;
        return { error: "User not found" };
      }

      const friendCode = await ensureFriendCode(user.id);
      const friendStatus = await getFriendStatus(viewerId, targetId);
      const canView =
        !user.isProfilePrivate || friendStatus === "friends" || friendStatus === "self";

      const counts = await getUserCounts(targetId);
      const recentPosts = canView ? await getRecentPosts(targetId) : [];

      return {
        user: {
          id: user.id,
          username: user.username,
          avatarUrl: user.avatarUrl ?? null,
          friendCode: canView ? friendCode : null,
          isProfilePrivate: user.isProfilePrivate,
          createdAt: user.createdAt?.toISOString?.() ?? user.createdAt,
        },
        friendStatus,
        canView,
        counts,
        recentPosts,
      };
    },
    {
      query: t.Object({
        viewerId: t.Optional(t.String()),
      }),
    }
  );