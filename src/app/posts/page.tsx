import Link from "next/link";
import { headers } from "next/headers";

import styles from "./PosPage.module.css";

type PostCard = {
  id: string;
  slug: string;
  title: string;
  content: string;
  createdAt: string | null;
  coverImage?: string | null;
  author?: {
    id?: string;
    username?: string | null;
    avatarUrl?: string | null;
  };
  category?: {
    id?: string;
    title?: string | null;
  } | null;
  tags?: { id: string; name: string }[];
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

  const data = await res.json().catch(() => null);
  return Array.isArray(data?.posts) ? data.posts : [];
}

function getExcerpt(text: string, max = 170) {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max).trim()}…` : text;
}

export default async function PostsPage() {
  const posts = await getPosts();

  return (
    <div className={styles.page}>
      <div className="container">
        <div className={styles.header}>
          <div>
            <div className={styles.kicker}>GameHelp</div>
            <h1 className={styles.title}>Сообщество</h1>
            <p className={styles.subtitle}>
              Форум, обсуждения, обзоры, игровые вопросы и общение с другими игроками.
            </p>
          </div>

          <div className={styles.actions}>
            <Link href="/" className={styles.secondaryButton}>
              Главная
            </Link>
            <Link href="/posts/new" className={styles.primaryButton}>
              + Создать пост
            </Link>
          </div>
        </div>

        {posts.length === 0 ? (
          <div className={styles.empty}>
            Пока нет постов. <Link href="/posts/new">Создать первую тему</Link>
          </div>
        ) : (
          <div className={styles.grid}>
            {posts.map((post) => (
              <Link key={post.id} href={`/posts/${post.slug}`} className={styles.card}>
                {post.coverImage ? (
                  <img
                    src={post.coverImage}
                    alt={post.title}
                    className={styles.cover}
                  />
                ) : (
                  <div className={styles.coverPlaceholder}>🎮</div>
                )}

                <div className={styles.cardBody}>
                  <div className={styles.cardMeta}>
                    {post.author?.username ?? "Пользователь"}
                    {post.category?.title ? ` • ${post.category.title}` : ""}
                    {post.createdAt
                      ? ` • ${new Date(post.createdAt).toLocaleDateString("ru-RU")}`
                      : ""}
                  </div>

                  <div className={styles.cardTitle}>{post.title}</div>
                  <div className={styles.cardExcerpt}>{getExcerpt(post.content)}</div>

                  {post.tags?.length ? (
                    <div className={styles.tags}>
                      {post.tags.slice(0, 5).map((tag) => (
                        <span key={tag.id} className={styles.tag}>
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