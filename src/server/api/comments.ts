import { Elysia, t } from "elysia";
import { and, asc, eq, inArray, sql } from "drizzle-orm";

import { db } from "../db";
import { commentLikes, comments, posts } from "../db/schema";

type CommentTreeNode = {
  id: string;
  postId: string;
  parentId: string | null;
  content: string;
  createdAt: string | null;
  author: {
    id: string;
    username: string;
    avatarUrl: string | null;
  };
  likeCount: number;
  dislikeCount: number;
  likedByMe: boolean;
  dislikedByMe: boolean;
  replies: CommentTreeNode[];
};

export const commentsRouter = new Elysia()
  .get(
    "/posts/:slug/comments",
    async ({ params, query, set }) => {
      const post = await db.query.posts.findFirst({
        where: eq(posts.slug, params.slug),
        columns: { id: true },
      });

      if (!post) {
        set.status = 404;
        return { error: "Post not found" };
      }

      const list = await db.query.comments.findMany({
        where: eq(comments.postId, post.id),
        orderBy: [asc(comments.createdAt)],
        with: {
          author: true,
        },
      });

      if (list.length === 0) {
        return { comments: [] as CommentTreeNode[] };
      }

      const commentIds = list.map((item) => item.id);

      const counts = await db
        .select({
          commentId: commentLikes.commentId,
          type: commentLikes.type,
          count: sql<number>`count(*)`.as("count"),
        })
        .from(commentLikes)
        .where(inArray(commentLikes.commentId, commentIds))
        .groupBy(commentLikes.commentId, commentLikes.type);

      const myReactions = query.viewerId
        ? await db
            .select({
              commentId: commentLikes.commentId,
              type: commentLikes.type,
            })
            .from(commentLikes)
            .where(
              and(
                inArray(commentLikes.commentId, commentIds),
                eq(commentLikes.userId, query.viewerId)
              )
            )
        : [];

      const likeCountMap = new Map<string, number>();
      const dislikeCountMap = new Map<string, number>();

      for (const row of counts) {
        const value = Number(row.count) || 0;

        if (row.type === "like") likeCountMap.set(row.commentId, value);
        if (row.type === "dislike") dislikeCountMap.set(row.commentId, value);
      }

      const myLikeSet = new Set(
        myReactions
          .filter((row) => row.type === "like")
          .map((row) => row.commentId)
      );

      const myDislikeSet = new Set(
        myReactions
          .filter((row) => row.type === "dislike")
          .map((row) => row.commentId)
      );

      const nodeMap = new Map<string, CommentTreeNode>();

      for (const comment of list) {
        nodeMap.set(comment.id, {
          id: comment.id,
          postId: comment.postId,
          parentId: comment.parentId,
          content: comment.content,
          createdAt: comment.createdAt?.toISOString?.() ?? null,
          author: {
            id: comment.author.id,
            username: comment.author.username,
            avatarUrl: comment.author.avatarUrl ?? null,
          },
          likeCount: likeCountMap.get(comment.id) ?? 0,
          dislikeCount: dislikeCountMap.get(comment.id) ?? 0,
          likedByMe: myLikeSet.has(comment.id),
          dislikedByMe: myDislikeSet.has(comment.id),
          replies: [],
        });
      }

      const roots: CommentTreeNode[] = [];

      for (const node of nodeMap.values()) {
        if (node.parentId && nodeMap.has(node.parentId)) {
          nodeMap.get(node.parentId)!.replies.push(node);
        } else {
          roots.push(node);
        }
      }

      return { comments: roots };
    },
    {
      query: t.Object({
        viewerId: t.Optional(t.String()),
      }),
    }
  )

  .post(
    "/posts/:slug/comments",
    async ({ params, body, set }) => {
      const post = await db.query.posts.findFirst({
        where: eq(posts.slug, params.slug),
        columns: { id: true },
      });

      if (!post) {
        set.status = 404;
        return { error: "Post not found" };
      }

      const content = body.content.trim();

      if (!content) {
        set.status = 400;
        return { error: "Пустой комментарий" };
      }

      if (body.parentId) {
        const parent = await db.query.comments.findFirst({
          where: eq(comments.id, body.parentId),
          columns: { id: true, postId: true },
        });

        if (!parent || parent.postId !== post.id) {
          set.status = 400;
          return { error: "Некорректный parentId" };
        }
      }

      const inserted = await db
        .insert(comments)
        .values({
          postId: post.id,
          authorId: body.userId,
          content,
          parentId: body.parentId ?? null,
        })
        .returning();

      return {
        success: true,
        comment: inserted[0],
      };
    },
    {
      body: t.Object({
        userId: t.String(),
        content: t.String(),
        parentId: t.Optional(t.Nullable(t.String())),
      }),
    }
  )

  .post(
    "/comments/:commentId/reaction",
    async ({ params, body }) => {
      const existing = await db.query.commentLikes.findFirst({
        where: and(
          eq(commentLikes.commentId, params.commentId),
          eq(commentLikes.userId, body.userId)
        ),
        columns: { id: true, type: true },
      });

      if (existing) {
        if (existing.type === body.type) {
          await db.delete(commentLikes).where(eq(commentLikes.id, existing.id));
        } else {
          await db
            .update(commentLikes)
            .set({
              type: body.type,
              createdAt: new Date(),
            })
            .where(eq(commentLikes.id, existing.id));
        }
      } else {
        await db.insert(commentLikes).values({
          commentId: params.commentId,
          userId: body.userId,
          type: body.type,
        });
      }

      return { success: true };
    },
    {
      body: t.Object({
        userId: t.String(),
        type: t.Union([t.Literal("like"), t.Literal("dislike")]),
      }),
    }
  );