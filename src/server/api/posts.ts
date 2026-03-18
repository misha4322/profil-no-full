import { Elysia, t } from "elysia";
import { and, desc, eq, sql } from "drizzle-orm";

import { db } from "../db";
import { postLikes, postTags, posts } from "../db/schema";
import { slugify } from "../../lib/slug";

async function makeUniqueSlug(title: string) {
  const base = slugify(title) || "post";
  let slug = base;
  let i = 1;

  while (true) {
    const existing = await db.query.posts.findFirst({
      where: eq(posts.slug, slug),
      columns: { id: true },
    });

    if (!existing) {
      return slug;
    }

    slug = `${base}-${i++}`;
  }
}

export const postsRouter = new Elysia({ prefix: "/posts" })
  .get("/", async () => {
    const list = await db.query.posts.findMany({
      where: eq(posts.isPublished, true),
      orderBy: [desc(posts.createdAt)],
      with: {
        author: true,
        category: true,
        postTags: {
          with: {
            tag: true,
          },
        },
      },
    });

    return {
      posts: list.map((post) => ({
        id: post.id,
        slug: post.slug,
        title: post.title,
        content: post.content,
        coverImage: post.coverImage ?? null,
        createdAt: post.createdAt?.toISOString?.() ?? null,
        author: post.author
          ? {
              id: post.author.id,
              username: post.author.username,
              avatarUrl: post.author.avatarUrl ?? null,
            }
          : null,
        category: post.category
          ? {
              id: post.category.id,
              title: post.category.title,
            }
          : null,
        tags: post.postTags.map((item) => ({
          id: item.tag.id,
          name: item.tag.name,
        })),
      })),
    };
  })

  .get(
    "/:slug",
    async ({ params, query, set }) => {
      const post = await db.query.posts.findFirst({
        where: and(eq(posts.slug, params.slug), eq(posts.isPublished, true)),
        with: {
          author: true,
          category: true,
          postTags: {
            with: {
              tag: true,
            },
          },
        },
      });

      if (!post) {
        set.status = 404;
        return { error: "Post not found" };
      }

      const counts = await db
        .select({
          type: postLikes.type,
          count: sql<number>`count(*)`.as("count"),
        })
        .from(postLikes)
        .where(eq(postLikes.postId, post.id))
        .groupBy(postLikes.type);

      let likeCount = 0;
      let dislikeCount = 0;

      for (const row of counts) {
        const value = Number(row.count) || 0;

        if (row.type === "like") likeCount = value;
        if (row.type === "dislike") dislikeCount = value;
      }

      let likedByMe = false;
      let dislikedByMe = false;

      if (query.viewerId) {
        const myReaction = await db.query.postLikes.findFirst({
          where: and(
            eq(postLikes.postId, post.id),
            eq(postLikes.userId, query.viewerId)
          ),
          columns: { type: true },
        });

        likedByMe = myReaction?.type === "like";
        dislikedByMe = myReaction?.type === "dislike";
      }

      return {
        post: {
          id: post.id,
          slug: post.slug,
          title: post.title,
          content: post.content,
          createdAt: post.createdAt?.toISOString?.() ?? null,
          coverImage: post.coverImage ?? null,
          author: post.author
            ? {
                id: post.author.id,
                username: post.author.username,
                avatarUrl: post.author.avatarUrl ?? null,
              }
            : null,
          category: post.category
            ? {
                id: post.category.id,
                title: post.category.title,
              }
            : null,
          tags: post.postTags.map((item) => ({
            id: item.tag.id,
            name: item.tag.name,
          })),
          likeCount,
          dislikeCount,
          likedByMe,
          dislikedByMe,
        },
      };
    },
    {
      query: t.Object({
        viewerId: t.Optional(t.String()),
      }),
    }
  )

  .post(
    "/",
    async ({ body, set }) => {
      const title = body.title.trim();
      const content = body.content.trim();
      const categoryId = body.categoryId ?? null;
      const tagIds = Array.from(new Set(body.tagIds ?? []));
      const isPublished = body.isPublished === false ? false : true;
      const coverImage = body.coverImage ?? null;

      if (!title || !content) {
        set.status = 400;
        return { error: "Заполните title и content" };
      }

      const author = await db.query.users.findFirst({
        where: eq(require("../db/schema").users.id, body.userId),
        columns: { id: true },
      });

      if (!author) {
        set.status = 401;
        return { error: "User not found" };
      }

      const slug = await makeUniqueSlug(title);

      const inserted = await db
        .insert(posts)
        .values({
          title,
          slug,
          content,
          authorId: body.userId,
          categoryId,
          isPublished,
          coverImage,
        })
        .returning({
          id: posts.id,
          slug: posts.slug,
        });

      const post = inserted[0];

      if (tagIds.length > 0) {
        await db.insert(postTags).values(
          tagIds.map((tagId) => ({
            postId: post.id,
            tagId,
          }))
        );
      }

      return {
        success: true,
        post: {
          id: post.id,
          slug: post.slug,
        },
      };
    },
    {
      body: t.Object({
        userId: t.String(),
        title: t.String(),
        content: t.String(),
        categoryId: t.Optional(t.Nullable(t.String())),
        tagIds: t.Optional(t.Array(t.String())),
        isPublished: t.Optional(t.Boolean()),
        coverImage: t.Optional(t.Nullable(t.String())),
      }),
    }
  )

  .post(
    "/:slug/reaction",
    async ({ params, body, set }) => {
      const post = await db.query.posts.findFirst({
        where: eq(posts.slug, params.slug),
        columns: { id: true },
      });

      if (!post) {
        set.status = 404;
        return { error: "Post not found" };
      }

      const existing = await db.query.postLikes.findFirst({
        where: and(
          eq(postLikes.postId, post.id),
          eq(postLikes.userId, body.userId)
        ),
        columns: { id: true, type: true },
      });

      if (existing) {
        if (existing.type === body.type) {
          await db.delete(postLikes).where(eq(postLikes.id, existing.id));
        } else {
          await db
            .update(postLikes)
            .set({ type: body.type })
            .where(eq(postLikes.id, existing.id));
        }
      } else {
        await db.insert(postLikes).values({
          postId: post.id,
          userId: body.userId,
          type: body.type,
        });
      }

      const counts = await db
        .select({
          type: postLikes.type,
          count: sql<number>`count(*)`.as("count"),
        })
        .from(postLikes)
        .where(eq(postLikes.postId, post.id))
        .groupBy(postLikes.type);

      let likeCount = 0;
      let dislikeCount = 0;

      for (const row of counts) {
        const value = Number(row.count) || 0;

        if (row.type === "like") likeCount = value;
        if (row.type === "dislike") dislikeCount = value;
      }

      const myReaction = await db.query.postLikes.findFirst({
        where: and(
          eq(postLikes.postId, post.id),
          eq(postLikes.userId, body.userId)
        ),
        columns: { type: true },
      });

      return {
        likeCount,
        dislikeCount,
        likedByMe: myReaction?.type === "like",
        dislikedByMe: myReaction?.type === "dislike",
      };
    },
    {
      body: t.Object({
        userId: t.String(),
        type: t.Union([t.Literal("like"), t.Literal("dislike")]),
      }),
    }
  );
