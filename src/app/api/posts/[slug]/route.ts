import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { and, eq, sql } from "drizzle-orm";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/server/db";
import { postLikes, posts } from "@/server/db/schema";
import { resolveUserUuid } from "@/lib/user-utils";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const post = await db.query.posts.findFirst({
      where: eq(posts.slug, slug),
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
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    let userId: string | null = null;

    try {
      const session = await getServerSession(authOptions);
      userId = session ? await resolveUserUuid(session) : null;
    } catch (sessionError) {
      console.error("GET /api/posts/[slug] session warning:", sessionError);
      userId = null;
    }

    const likes = await db
      .select({
        type: postLikes.type,
        count: sql`count(*)`.as("count"),
      })
      .from(postLikes)
      .where(eq(postLikes.postId, post.id))
      .groupBy(postLikes.type);

    let likeCount = 0;
    let dislikeCount = 0;

    for (const row of likes) {
      const n = Number(row.count) || 0;

      if (row.type === "like") likeCount = n;
      if (row.type === "dislike") dislikeCount = n;
    }

    let likedByMe = false;
    let dislikedByMe = false;

    if (userId) {
      try {
        const my = await db.query.postLikes.findFirst({
          where: and(eq(postLikes.postId, post.id), eq(postLikes.userId, userId)),
          columns: { type: true },
        });

        likedByMe = my?.type === "like";
        dislikedByMe = my?.type === "dislike";
      } catch (reactionError) {
        console.error("GET /api/posts/[slug] reaction warning:", reactionError);
      }
    }

    return NextResponse.json({
      post: {
        id: post.id,
        slug: post.slug,
        title: post.title,
        content: post.content,
        createdAt: post.createdAt?.toISOString() ?? null,
        coverImage: post.coverImage ?? null,
        author: post.author
          ? {
              id: post.author.id,
              username: post.author.username,
              avatarUrl: post.author.avatarUrl ?? null,
            }
          : {
              id: "",
              username: "Пользователь",
              avatarUrl: null,
            },
        category: post.category
          ? {
              id: post.category.id,
              title: post.category.title,
            }
          : null,
        tags: Array.isArray(post.postTags)
          ? post.postTags.map((x) => ({
              id: x.tag.id,
              name: x.tag.name,
            }))
          : [],
        likeCount,
        dislikeCount,
        likedByMe,
        dislikedByMe,
      },
    });
  } catch (e) {
    console.error("GET /api/posts/[slug] error:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}