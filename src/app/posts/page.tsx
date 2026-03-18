import Link from "next/link";
import { headers } from "next/headers";

type PostCard = {
  id: string;
  slug: string;
  title: string;
  content: string;
  createdAt: string | null;
  coverImage?: string | null;
  author: { username: string; avatarUrl?: string | null };
  category: { title: string } | null;
  tags: { id: string; name: string }[];
};

async function getBaseUrl() {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ??
    (process.env.NODE_ENV === "development" ? "http" : "https");
  return `${proto}://${host}`;
}

async function getPosts(): Promise<PostCard[]> {
  const base = await getBaseUrl();
  const res = await fetch(`${base}/api/posts`, { cache: "no-store" });

  if (!res.ok) return [];

  const data = await res.json();
  return data.posts ?? [];
}

function getExcerpt(text: string, max = 200) {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max).trim()}…` : text;
}

export default async function PostsPage() {
  const posts = await getPosts();

  return (
    <div className="posts-page">
      <div className="container">
        <div className="posts-header">
          <div>
            <h1 className="posts-title">Форум GameHelp</h1>
            <div className="posts-subtitle">
              Все обсуждения, вопросы, обзоры и игровые посты в одном месте.
            </div>
          </div>

          <div className="posts-actions">
            <Link href="/" className="posts-action-link">
              Главная
            </Link>
            <Link href="/posts/new" className="posts-action-link primary">
              + Создать пост
            </Link>
          </div>
        </div>

        {posts.length === 0 ? (
          <div className="posts-empty">
            Пока нет постов. <Link href="/posts/new">Создать первую тему</Link>
          </div>
        ) : (
          <div className="posts-grid">
            {posts.map((post) => (
              <Link key={post.id} href={`/posts/${post.slug}`} className="post-card">
                {post.coverImage ? (
                  <img
                    src={post.coverImage}
                    alt={post.title}
                    className="post-card-cover"
                  />
                ) : (
                  <div className="post-card-cover placeholder">🎮</div>
                )}

                <div className="post-card-body">
                  <div className="post-card-title">{post.title}</div>

                  <div className="post-card-meta">
                    {post.author.username}
                    {post.category ? ` • ${post.category.title}` : ""}
                    {post.createdAt
                      ? ` • ${new Date(post.createdAt).toLocaleDateString("ru-RU")}`
                      : ""}
                  </div>

                  <div className="post-card-excerpt">{getExcerpt(post.content)}</div>

                  {post.tags?.length ? (
                    <div className="post-card-tags">
                      {post.tags.slice(0, 5).map((tag) => (
                        <span key={tag.id} className="post-card-tag">
                          #{tag.name}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}