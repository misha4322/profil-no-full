import { Elysia, t } from "elysia";
import { and, asc, desc, eq, inArray, or } from "drizzle-orm";
import {
  conversationMembers,
  conversations,
  friendships,
  messages,
  posts,
  users,
} from "../db/schema";
import { db } from "../db";

const nullableString = t.Union([t.String(), t.Null()]);

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error);
}

function buildDirectKey(a: string, b: string) {
  return [a, b].sort().join(":");
}

async function areFriends(userA: string, userB: string) {
  const rows = await db
    .select({ id: friendships.id })
    .from(friendships)
    .where(
      and(
        eq(friendships.status, "accepted"),
        or(
          and(
            eq(friendships.requesterId, userA),
            eq(friendships.addresseeId, userB)
          ),
          and(
            eq(friendships.requesterId, userB),
            eq(friendships.addresseeId, userA)
          )
        )
      )
    )
    .limit(1);

  return !!rows[0];
}

async function ensureDirectConversation(userId: string, friendId: string) {
  if (userId === friendId) {
    throw new Error("Нельзя создать диалог с самим собой");
  }

  const friends = await areFriends(userId, friendId);
  if (!friends) {
    throw new Error("Личные сообщения доступны только друзьям");
  }

  const directKey = buildDirectKey(userId, friendId);

  const existing = await db
    .select({
      id: conversations.id,
      directKey: conversations.directKey,
      updatedAt: conversations.updatedAt,
      lastMessageAt: conversations.lastMessageAt,
    })
    .from(conversations)
    .where(eq(conversations.directKey, directKey))
    .limit(1);

  if (existing[0]) {
    const existingMembers = await db
      .select({
        conversationId: conversationMembers.conversationId,
        userId: conversationMembers.userId,
      })
      .from(conversationMembers)
      .where(eq(conversationMembers.conversationId, existing[0].id));

    const memberIds = new Set(existingMembers.map((m) => m.userId));

    if (!memberIds.has(userId) || !memberIds.has(friendId)) {
      await db
        .insert(conversationMembers)
        .values([
          {
            conversationId: existing[0].id,
            userId,
          },
          {
            conversationId: existing[0].id,
            userId: friendId,
          },
        ])
        .onConflictDoNothing();
    }

    return existing[0];
  }

  const inserted = await db
    .insert(conversations)
    .values({
      type: "direct",
      directKey,
      updatedAt: new Date(),
      lastMessageAt: null,
    })
    .returning({
      id: conversations.id,
      directKey: conversations.directKey,
      updatedAt: conversations.updatedAt,
      lastMessageAt: conversations.lastMessageAt,
    });

  const conversation = inserted[0];

  await db
    .insert(conversationMembers)
    .values([
      {
        conversationId: conversation.id,
        userId,
      },
      {
        conversationId: conversation.id,
        userId: friendId,
      },
    ])
    .onConflictDoNothing();

  return conversation;
}

async function ensureMembership(conversationId: string, userId: string) {
  const rows = await db
    .select({
      conversationId: conversationMembers.conversationId,
      userId: conversationMembers.userId,
      lastReadAt: conversationMembers.lastReadAt,
    })
    .from(conversationMembers)
    .where(
      and(
        eq(conversationMembers.conversationId, conversationId),
        eq(conversationMembers.userId, userId)
      )
    )
    .limit(1);

  return rows[0] ?? null;
}

export const messagesRouter = new Elysia({ prefix: "/messages" })

  .get("/conversations/:userId", async ({ params, set }) => {
    try {
      const memberRows = await db
        .select({
          conversationId: conversationMembers.conversationId,
          lastReadAt: conversationMembers.lastReadAt,
        })
        .from(conversationMembers)
        .where(eq(conversationMembers.userId, params.userId));

      const conversationIds = memberRows.map((row) => row.conversationId);

      if (!conversationIds.length) {
        return { conversations: [] };
      }

      const convRows = await db
        .select({
          id: conversations.id,
          directKey: conversations.directKey,
          updatedAt: conversations.updatedAt,
          lastMessageAt: conversations.lastMessageAt,
        })
        .from(conversations)
        .where(inArray(conversations.id, conversationIds))
        .orderBy(desc(conversations.lastMessageAt), desc(conversations.updatedAt));

      const allMembers = await db
        .select({
          conversationId: conversationMembers.conversationId,
          userId: conversationMembers.userId,
        })
        .from(conversationMembers)
        .where(inArray(conversationMembers.conversationId, conversationIds));

      const otherMemberIds = Array.from(
        new Set(
          allMembers
            .filter((m) => m.userId !== params.userId)
            .map((m) => m.userId)
        )
      );

      const userRows = otherMemberIds.length
        ? await db
            .select({
              id: users.id,
              username: users.username,
              avatarUrl: users.avatarUrl,
            })
            .from(users)
            .where(inArray(users.id, otherMemberIds))
        : [];

      const messageRows = await db
        .select({
          id: messages.id,
          conversationId: messages.conversationId,
          senderId: messages.senderId,
          type: messages.type,
          content: messages.content,
          sharedPostId: messages.sharedPostId,
          createdAt: messages.createdAt,
        })
        .from(messages)
        .where(inArray(messages.conversationId, conversationIds))
        .orderBy(desc(messages.createdAt));

      const lastMessageMap = new Map<string, (typeof messageRows)[number]>();

      for (const msg of messageRows) {
        if (!lastMessageMap.has(msg.conversationId)) {
          lastMessageMap.set(msg.conversationId, msg);
        }
      }

      const sharedPostIds = Array.from(
        new Set(
          messageRows
            .map((m) => m.sharedPostId)
            .filter((v): v is string => !!v)
        )
      );

      const sharedPosts = sharedPostIds.length
        ? await db
            .select({
              id: posts.id,
              slug: posts.slug,
              title: posts.title,
              coverImage: posts.coverImage,
            })
            .from(posts)
            .where(inArray(posts.id, sharedPostIds))
        : [];

      const userMap = new Map(userRows.map((u) => [u.id, u]));
      const sharedPostMap = new Map(sharedPosts.map((p) => [p.id, p]));

      return {
        conversations: convRows.map((conversation) => {
          const otherMember = allMembers.find(
            (m) =>
              m.conversationId === conversation.id && m.userId !== params.userId
          );

          const otherUser = otherMember ? userMap.get(otherMember.userId) ?? null : null;
          const lastMessage = lastMessageMap.get(conversation.id) ?? null;

          return {
            id: conversation.id,
            updatedAt:
              conversation.updatedAt?.toISOString?.() ?? conversation.updatedAt,
            lastMessageAt:
              conversation.lastMessageAt?.toISOString?.() ?? conversation.lastMessageAt,
            otherUser: otherUser
              ? {
                  id: otherUser.id,
                  username: otherUser.username,
                  avatarUrl: otherUser.avatarUrl ?? null,
                }
              : null,
            lastReadAt:
              memberRows.find((m) => m.conversationId === conversation.id)?.lastReadAt?.toISOString?.() ??
              memberRows.find((m) => m.conversationId === conversation.id)?.lastReadAt ??
              null,
            lastMessage: lastMessage
              ? {
                  id: lastMessage.id,
                  senderId: lastMessage.senderId,
                  type: lastMessage.type,
                  content: lastMessage.content ?? null,
                  createdAt:
                    lastMessage.createdAt?.toISOString?.() ?? lastMessage.createdAt,
                  sharedPost: lastMessage.sharedPostId
                    ? sharedPostMap.get(lastMessage.sharedPostId) ?? null
                    : null,
                }
              : null,
          };
        }),
      };
    } catch (error: unknown) {
      console.error("GET /api/messages/conversations/:userId error:", error);
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

  .get("/direct/:userId/:friendId", async ({ params, set }) => {
    try {
      const conversation = await ensureDirectConversation(
        params.userId,
        params.friendId
      );

      return {
        conversation: {
          id: conversation.id,
          directKey: conversation.directKey,
          updatedAt:
            conversation.updatedAt?.toISOString?.() ?? conversation.updatedAt,
          lastMessageAt:
            conversation.lastMessageAt?.toISOString?.() ?? conversation.lastMessageAt,
        },
      };
    } catch (error: unknown) {
      console.error("GET /api/messages/direct/:userId/:friendId error:", error);
      const message = getErrorMessage(error);
      set.status = message.includes("друз") ? 403 : 500;
      return { error: message };
    }
  })

  .get(
    "/:conversationId",
    async ({ params, query, set }) => {
      try {
        const membership = await ensureMembership(
          params.conversationId,
          String(query.userId)
        );

        if (!membership) {
          set.status = 403;
          return { error: "Нет доступа к диалогу" };
        }

        const messageRows = await db
          .select({
            id: messages.id,
            conversationId: messages.conversationId,
            senderId: messages.senderId,
            type: messages.type,
            content: messages.content,
            sharedPostId: messages.sharedPostId,
            createdAt: messages.createdAt,
            editedAt: messages.editedAt,
          })
          .from(messages)
          .where(eq(messages.conversationId, params.conversationId))
          .orderBy(asc(messages.createdAt));

        const senderIds = Array.from(new Set(messageRows.map((m) => m.senderId)));

        const senderRows = senderIds.length
          ? await db
              .select({
                id: users.id,
                username: users.username,
                avatarUrl: users.avatarUrl,
              })
              .from(users)
              .where(inArray(users.id, senderIds))
          : [];

        const sharedPostIds = Array.from(
          new Set(
            messageRows
              .map((m) => m.sharedPostId)
              .filter((v): v is string => !!v)
          )
        );

        const sharedPosts = sharedPostIds.length
          ? await db
              .select({
                id: posts.id,
                slug: posts.slug,
                title: posts.title,
                coverImage: posts.coverImage,
              })
              .from(posts)
              .where(inArray(posts.id, sharedPostIds))
          : [];

        const senderMap = new Map(senderRows.map((s) => [s.id, s]));
        const sharedPostMap = new Map(sharedPosts.map((p) => [p.id, p]));

        return {
          messages: messageRows.map((message) => ({
            id: message.id,
            conversationId: message.conversationId,
            senderId: message.senderId,
            type: message.type,
            content: message.content ?? null,
            createdAt: message.createdAt?.toISOString?.() ?? message.createdAt,
            editedAt: message.editedAt?.toISOString?.() ?? message.editedAt,
            sender: senderMap.get(message.senderId) ?? null,
            sharedPost: message.sharedPostId
              ? sharedPostMap.get(message.sharedPostId) ?? null
              : null,
          })),
        };
      } catch (error: unknown) {
        console.error("GET /api/messages/:conversationId error:", error);
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
        userId: t.String(),
      }),
    }
  )

  .post(
    "/send",
    async ({ body, set }) => {
      try {
        const content = String(body.content ?? "").trim();
        const sharedPostId = body.sharedPostId ?? null;

        if (!content && !sharedPostId) {
          set.status = 400;
          return { error: "Нужно текстовое сообщение или sharedPostId" };
        }

        let conversationId = body.conversationId ?? null;

        if (!conversationId) {
          if (!body.targetUserId) {
            set.status = 400;
            return { error: "Нужен conversationId или targetUserId" };
          }

          const conversation = await ensureDirectConversation(
            body.userId,
            body.targetUserId
          );

          conversationId = conversation.id;
        }

        const membership = await ensureMembership(conversationId, body.userId);

        if (!membership) {
          set.status = 403;
          return { error: "Нет доступа к диалогу" };
        }

        if (sharedPostId) {
          const postRows = await db
            .select({ id: posts.id })
            .from(posts)
            .where(eq(posts.id, sharedPostId))
            .limit(1);

          if (!postRows[0]) {
            set.status = 404;
            return { error: "Пост не найден" };
          }
        }

        const inserted = await db
          .insert(messages)
          .values({
            conversationId,
            senderId: body.userId,
            type: sharedPostId ? "post_share" : "text",
            content: content || null,
            sharedPostId,
          })
          .returning({
            id: messages.id,
            conversationId: messages.conversationId,
            senderId: messages.senderId,
            type: messages.type,
            content: messages.content,
            sharedPostId: messages.sharedPostId,
            createdAt: messages.createdAt,
            editedAt: messages.editedAt,
          });

        await db
          .update(conversations)
          .set({
            updatedAt: new Date(),
            lastMessageAt: new Date(),
          })
          .where(eq(conversations.id, conversationId));

        return {
          success: true,
          message: {
            ...inserted[0],
            createdAt:
              inserted[0].createdAt?.toISOString?.() ?? inserted[0].createdAt,
            editedAt:
              inserted[0].editedAt?.toISOString?.() ?? inserted[0].editedAt,
          },
        };
      } catch (error: unknown) {
        console.error("POST /api/messages/send error:", error);
        const message = getErrorMessage(error);
        set.status = message.includes("друз") ? 403 : 500;
        return { error: message };
      }
    },
    {
      body: t.Object({
        userId: t.String(),
        conversationId: t.Optional(t.String()),
        targetUserId: t.Optional(t.String()),
        content: t.Optional(nullableString),
        sharedPostId: t.Optional(nullableString),
      }),
    }
  )

  .post(
    "/read",
    async ({ body, set }) => {
      try {
        const membership = await ensureMembership(body.conversationId, body.userId);

        if (!membership) {
          set.status = 403;
          return { error: "Нет доступа к диалогу" };
        }

        await db
          .update(conversationMembers)
          .set({ lastReadAt: new Date() })
          .where(
            and(
              eq(conversationMembers.conversationId, body.conversationId),
              eq(conversationMembers.userId, body.userId)
            )
          );

        return { success: true };
      } catch (error: unknown) {
        console.error("POST /api/messages/read error:", error);
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
        conversationId: t.String(),
      }),
    }
  );