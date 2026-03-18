import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
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

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    throw new Error("Failed to load post");
  }

  const data = await res.json().catch(() => null);

  if (!data || !data.post) {
    return null;
  }

  return data.post;
}

export default async function PostPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const post = await getPost(slug);

  if (!post) {
    notFound();
  }

  const authorHref = post.author?.id ? `/u/${post.author.id}` : null;

  return (
    <div className="post-page">
      <div className="container post-layout">
        <div className="post-main">
          <div className="post-navigation">
            <Link href="/posts" className="post-nav-link">
              ← К постам
            </Link>
            <Link href="/" className="post-nav-link">
              Главная
            </Link>
          </div>

          <article className="post-hero-card">
            {post.coverImage ? (
              <img
                src={post.coverImage}
                alt={post.title ?? "Обложка поста"}
                className="post-cover"
              />
            ) : null}

            <div className="post-hero-body">
              <h1 className="post-title">{post.title}</h1>

              <div className="post-meta">
                <span>
                  Автор:{" "}
                  {authorHref ? (
                    <Link href={authorHref} className="post-author-link">
                      {post.author?.username ?? "Пользователь"}
                    </Link>
                  ) : (
                    <span>{post.author?.username ?? "Пользователь"}</span>
                  )}
                </span>

                {post.category ? <span>Игра: {post.category.title}</span> : null}

                {post.createdAt ? (
                  <span>
                    Опубликовано: {new Date(post.createdAt).toLocaleString("ru-RU")}
                  </span>
                ) : null}
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

              <div className="post-action-row">
                <PostReactions
                  slug={slug}
                  likeCount={Number(post.likeCount) || 0}
                  dislikeCount={Number(post.dislikeCount) || 0}
                  likedByMe={!!post.likedByMe}
                  dislikedByMe={!!post.dislikedByMe}
                />

                <SharePostButton postId={post.id} title={post.title} />
              </div>
            </div>
          </article>

          <section className="post-content-card">
            <div className="post-content">{post.content}</div>
          </section>

          <Comments postSlug={slug} />
        </div>

        <aside className="post-sidebar">
          <div className="post-side-card">
            <h2 className="post-side-title">О публикации</h2>

            <div className="post-side-list">
              <div className="post-side-item">
                👍 Лайков: {Number(post.likeCount) || 0}
              </div>
              <div className="post-side-item">
                👎 Дизлайков: {Number(post.dislikeCount) || 0}
              </div>
              <div className="post-side-item">
                🏷️ Тегов: {Array.isArray(post.tags) ? post.tags.length : 0}
              </div>
            </div>
          </div>

          <div className="post-side-card">
            <h2 className="post-side-title">Автор</h2>

            <div className="post-side-list">
              <div className="post-side-item">
                {authorHref ? (
                  <Link href={authorHref} className="post-author-link">
                    {post.author?.username ?? "Пользователь"}
                  </Link>
                ) : (
                  <span>{post.author?.username ?? "Пользователь"}</span>
                )}
              </div>

              {post.category ? (
                <div className="post-side-item">Категория: {post.category.title}</div>
              ) : null}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}