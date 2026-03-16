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

function normalizeUsername(value: string) {
  return value.trim().replace(/\s+/g, " ").slice(0, 32);
}

function isValidUsername(value: string) {
  if (value.length < 3 || value.length > 32) return false;
  return /^[\p{L}\p{N} _.-]+$/u.test(value);
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error);
}

async function getFriendStatus(viewerId: string | null, targetId: string) {
  if (!viewerId) return "none" as const;
  if (viewerId === targetId) return "self" as const;

  const directRows = await db
    .select({ status: friendships.status })
    .from(friendships)
    .where(
      and(
        eq(friendships.requesterId, viewerId),
        eq(friendships.addresseeId, targetId)
      )
    )
    .limit(1);

  const reverseRows = await db
    .select({ status: friendships.status })
    .from(friendships)
    .where(
      and(
        eq(friendships.requesterId, targetId),
        eq(friendships.addresseeId, viewerId)
      )
    )
    .limit(1);

  const direct = directRows[0];
  const reverse = reverseRows[0];

  if (direct?.status === "accepted" || reverse?.status === "accepted") {
    return "friends" as const;
  }

  if (direct?.status === "pending") {
    return "outgoing" as const;
  }

  if (reverse?.status === "pending") {
    return "incoming" as const;
  }

  return "none" as const;
}

async function getUserCounts(userId: string) {
  try {
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
          or(
            eq(friendships.requesterId, userId),
            eq(friendships.addresseeId, userId)
          )
        )
      );

    return {
      posts: Number(postsRow?.count ?? 0),
      comments: Number(commentsRow?.count ?? 0),
      friends: Number(friendsRow?.count ?? 0),
    };
  } catch {
    return {
      posts: 0,
      comments: 0,
      friends: 0,
    };
  }
}

async function getRecentPosts(userId: string) {
  try {
    const list = await db
      .select({
        id: posts.id,
        slug: posts.slug,
        title: posts.title,
        coverImage: posts.coverImage,
        createdAt: posts.createdAt,
      })
      .from(posts)
      .where(and(eq(posts.authorId, userId), eq(posts.isPublished, true)))
      .orderBy(desc(posts.createdAt))
      .limit(6);

    return list.map((post) => ({
      ...post,
      coverImage: post.coverImage ?? null,
      createdAt: post.createdAt?.toISOString?.() ?? post.createdAt,
    }));
  } catch {
    return [];
  }
}

export const usersRouter = new Elysia({ prefix: "/users" })

  .get(
    "/search",
    async ({ query, set }) => {
      try {
        const q = String(query.q ?? "").trim();
        const viewerId = query.viewerId ? String(query.viewerId) : null;

        if (!q) {
          return { users: [] };
        }

        const whereClause = isUuid(q)
          ? or(ilike(users.username, `%${q}%`), eq(users.id, q))
          : ilike(users.username, `%${q}%`);

        const list = await db
          .select({
            id: users.id,
            username: users.username,
            avatarUrl: users.avatarUrl,
            createdAt: users.createdAt,
          })
          .from(users)
          .where(whereClause)
          .limit(20);

        const result = await Promise.all(
          list.map(async (user) => {
            const friendStatus = await getFriendStatus(viewerId, user.id);

            return {
              id: user.id,
              username: user.username,
              avatarUrl: user.avatarUrl ?? null,
              createdAt: user.createdAt?.toISOString?.() ?? user.createdAt,
              friendStatus,
              canView: true,
              isProfilePrivate: false,
              friendCode: null,
            };
          })
        );

        return { users: result };
      } catch (error: unknown) {
        console.error("GET /api/users/search error:", error);
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
      query: t.Object({
        q: t.Optional(t.String()),
        viewerId: t.Optional(t.String()),
      }),
    }
  )

  .get("/me/:userId", async ({ params, set }) => {
    try {
      const rows = await db
        .select({
          id: users.id,
          username: users.username,
          email: users.email,
          avatarUrl: users.avatarUrl,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.id, params.userId))
        .limit(1);

      const me = rows[0];

      if (!me) {
        set.status = 404;
        return { error: "User not found" };
      }

      const counts = await getUserCounts(me.id);
      const recentPosts = await getRecentPosts(me.id);

      return {
        user: {
          ...me,
          avatarUrl: me.avatarUrl ?? null,
          friendCode: null,
          isProfilePrivate: false,
          createdAt: me.createdAt?.toISOString?.() ?? me.createdAt,
        },
        counts,
        recentPosts,
      };
    } catch (error: unknown) {
      console.error("GET /api/users/me/:userId error:", error);
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

  .patch(
    "/me",
    async ({ body, set }) => {
      try {
        const userId = body.userId;

        const targetRows = await db
          .select({
            id: users.id,
            username: users.username,
          })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);

        const target = targetRows[0];

        if (!target) {
          set.status = 404;
          return { error: "User not found" };
        }

        const patch: Record<string, unknown> = {};
        const has = (key: string) =>
          Object.prototype.hasOwnProperty.call(body, key);

        if (has("username")) {
          const username = normalizeUsername(String(body.username ?? ""));

          if (!isValidUsername(username)) {
            set.status = 400;
            return {
              error: "Ник: 3–32 символа. Можно буквы, цифры, пробел, _, -, .",
            };
          }

          const existingRows = await db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.username, username))
            .limit(1);

          const existing = existingRows[0];

          if (existing && existing.id !== userId) {
            set.status = 409;
            return { error: "Этот ник уже занят" };
          }

          patch.username = username;
        }

        if (has("avatarUrl")) {
          patch.avatarUrl = body.avatarUrl ?? null;
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
            createdAt: users.createdAt,
          });

        return {
          success: true,
          user: {
            ...updated[0],
            avatarUrl: updated[0].avatarUrl ?? null,
            friendCode: null,
            isProfilePrivate: false,
            createdAt: updated[0].createdAt?.toISOString?.() ?? updated[0].createdAt,
          },
        };
      } catch (error: unknown) {
        console.error("PATCH /api/users/me error:", error);
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
        username: t.Optional(t.String()),
        avatarUrl: t.Optional(nullableString),
      }),
    }
  )

  .get(
    "/:id",
    async ({ params, query, set }) => {
      try {
        const targetId = params.id;
        const viewerId = query.viewerId ? String(query.viewerId) : null;

        const rows = await db
          .select({
            id: users.id,
            username: users.username,
            avatarUrl: users.avatarUrl,
            createdAt: users.createdAt,
          })
          .from(users)
          .where(eq(users.id, targetId))
          .limit(1);

        const user = rows[0];

        if (!user) {
          set.status = 404;
          return { error: "User not found" };
        }

        const friendStatus = await getFriendStatus(viewerId, targetId);
        const counts = await getUserCounts(targetId);
        const recentPosts = await getRecentPosts(targetId);

        return {
          user: {
            id: user.id,
            username: user.username,
            avatarUrl: user.avatarUrl ?? null,
            friendCode: null,
            isProfilePrivate: false,
            createdAt: user.createdAt?.toISOString?.() ?? user.createdAt,
          },
          friendStatus,
          canView: true,
          counts,
          recentPosts,
        };
      } catch (error: unknown) {
        console.error("GET /api/users/:id error:", error);
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
      query: t.Object({
        viewerId: t.Optional(t.String()),
      }),
    }
  );