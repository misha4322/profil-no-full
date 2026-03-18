import Link from "next/link";
import { headers } from "next/headers";
import Comments from "@/app/auth/components/Comments";
import PostReactions from "@/app/auth/components/PostReactions";
import SharePostButton from "@/app/posts/SharePostButton";

async function getBaseUrl() {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ??
    (process.env.NODE_ENV === "development" ? "http" : "https");

  return `${proto}://${host}`;
}

async function getPost(slug: string) {
  const base = await getBaseUrl();
  const res = await fetch(`${base}/api/posts/${encodeURIComponent(slug)}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to load post");
  }

  const data = await res.json();
  return data.post;
}

export default async function PostPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const post = await getPost(slug);

  return (
    <div className="post-page">
      <div className="container">
        <div className="post-navigation">
          <Link href="/posts" className="post-nav-link">
            ← К постам
          </Link>
          <Link href="/" className="post-nav-link">
            Главная
          </Link>
        </div>

        <h1 className="post-title">{post.title}</h1>

        <div className="post-meta">
          Автор: {post.author.username}
          {post.category ? ` • Игра: ${post.category.title}` : ""}
        </div>

        {post.tags?.length ? (
          <div className="post-tags">
            {post.tags.map((tag: any) => (
              <span key={tag.id} className="post-tag">
                #{tag.name}
              </span>
            ))}
          </div>
        ) : null}

        {post.coverImage && (
          <img
            src={post.coverImage}
            alt="Обложка поста"
            className="mt-4 rounded-2xl w-full max-h-[420px] object-cover border border-white/10"
          />
        )}

        <div className="post-content">{post.content}</div>

        <div className="flex items-center gap-3 mt-6 flex-wrap">
          <PostReactions
            slug={slug}
            likeCount={post.likeCount}
            dislikeCount={post.dislikeCount}
            likedByMe={post.likedByMe}
            dislikedByMe={post.dislikedByMe}
          />

          <SharePostButton postId={post.id} title={post.title} />
        </div>

        <Comments postSlug={slug} />
      </div>
    </div>
  );
}