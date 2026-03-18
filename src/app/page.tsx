import Link from "next/link";
import { headers } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import "./Home.css";

type PostCard = {
  id: string;
  slug: string;
  title: string;
  content: string;
  createdAt: string;
  coverImage?: string | null;
  author?: {
    username?: string | null;
    avatarUrl?: string | null;
  };
  category?: {
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

  if (!res.ok) {
    return [];
  }

  const data = await res.json();
  return Array.isArray(data?.posts) ? data.posts : [];
}

function normalizePostPreview(text: string) {
  return text
    .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function getExcerpt(text: string, max = 140) {
  const normalized = normalizePostPreview(text);

  if (!normalized) {
    return "";
  }

  return normalized.length > max
    ? `${normalized.slice(0, max).trim()}…`
    : normalized;
}

export default async function Home() {
  const [posts, session] = await Promise.all([
    getPosts(),
    getServerSession(authOptions),
  ]);

  const latest = posts.slice(0, 6);

  return (
    <div className="home-page">
      <section className="container home-hero">
        <div className="home-copy">
          <div className="home-badge">GameHelp • форум игроков</div>

          <h1 className="home-title">
            Игровое сообщество, где можно
            <span> спросить, обсудить и найти команду</span>
          </h1>

          <p className="home-subtitle">
            GameHelp — это место, где игроки делятся гайдами, обсуждают игры,
            ищут друзей, переписываются и помогают друг другу с любыми игровыми вопросами.
          </p>

          <div className="home-actions">
            {session ? (
              <>
                <Link href="/posts" className="home-button primary">
                  Открыть форум
                </Link>
                <Link href="/profile" className="home-button secondary">
                  Мой профиль
                </Link>
              </>
            ) : (
              <>
                <Link href="/auth/register" className="home-button primary">
                  Создать аккаунт
                </Link>
                <Link href="/auth/login" className="home-button secondary">
                  Войти
                </Link>
              </>
            )}
          </div>

          <div className="home-grid-stats">
            <div className="home-stat">
              <div className="home-stat-value">{posts.length}</div>
              <div className="home-stat-label">постов на форуме</div>
            </div>
            <div className="home-stat">
              <div className="home-stat-value">{latest.length}</div>
              <div className="home-stat-label">свежих тем</div>
            </div>
            <div className="home-stat">
              <div className="home-stat-value">24/7</div>
              <div className="home-stat-label">живое общение</div>
            </div>
          </div>
        </div>

        <div className="home-preview">
          <div className="home-preview-card">
            <div className="home-preview-header">
              <div>
                <div className="home-preview-label">Что есть в GameHelp</div>
                <div className="home-preview-title">Всё для игрового общения</div>
              </div>
            </div>

            <div className="home-preview-list">
              <div className="home-preview-item">
                <span className="home-preview-icon">💬</span>
                <div>
                  <div className="home-preview-item-title">Форум и обсуждения</div>
                  <div className="home-preview-item-text">
                    Создавай темы, делись мнением, обсуждай любимые игры.
                  </div>
                </div>
              </div>

              <div className="home-preview-item">
                <span className="home-preview-icon">🤝</span>
                <div>
                  <div className="home-preview-item-title">Друзья и поиск игроков</div>
                  <div className="home-preview-item-text">
                    Добавляй людей в друзья и находи тиммейтов.
                  </div>
                </div>
              </div>

              <div className="home-preview-item">
                <span className="home-preview-icon">📨</span>
                <div>
                  <div className="home-preview-item-title">Личные сообщения</div>
                  <div className="home-preview-item-text">
                    Общайся напрямую и пересылай интересные посты друзьям.
                  </div>
                </div>
              </div>

              <div className="home-preview-item">
                <span className="home-preview-icon">🎮</span>
                <div>
                  <div className="home-preview-item-title">Игровая тематика</div>
                  <div className="home-preview-item-text">
                    Платформа для советов, гайдов, обзоров и обсуждения новинок.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container home-section">
        <div className="home-section-header">
          <div>
            <div className="home-section-kicker">Возможности</div>
            <h2 className="home-section-title">Что можно делать на сайте</h2>
          </div>
        </div>

        <div className="home-features">
          <article className="home-feature">
            <div className="home-feature-icon">📝</div>
            <h3 className="home-feature-title">Публиковать посты</h3>
            <p className="home-feature-text">
              Делись обзорами, вопросами, новостями, мнением об играх и любыми игровыми историями.
            </p>
          </article>

          <article className="home-feature">
            <div className="home-feature-icon">💬</div>
            <h3 className="home-feature-title">Комментировать и отвечать</h3>
            <p className="home-feature-text">
              Обсуждай посты, ставь реакции и участвуй в ветках комментариев.
            </p>
          </article>

          <article className="home-feature">
            <div className="home-feature-icon">👥</div>
            <h3 className="home-feature-title">Находить друзей</h3>
            <p className="home-feature-text">
              Ищи пользователей, добавляй их в друзья и собирай своё игровое окружение.
            </p>
          </article>

          <article className="home-feature">
            <div className="home-feature-icon">🔔</div>
            <h3 className="home-feature-title">Не пропускать сообщения</h3>
            <p className="home-feature-text">
              В навигации виден индикатор новых сообщений, чтобы сразу замечать активность.
            </p>
          </article>
        </div>
      </section>

      <section className="container home-section">
        <div className="home-section-header">
          <div>
            <div className="home-section-kicker">Форум</div>
            <h2 className="home-section-title">Последние посты</h2>
          </div>

          <Link href="/posts" className="home-section-link">
            Все посты →
          </Link>
        </div>

        {latest.length === 0 ? (
          <div className="home-empty">
            Пока нет постов. После регистрации можно создать первую тему.
          </div>
        ) : (
          <div className="home-posts-grid">
            {latest.map((post) => (
              <Link key={post.id} href={`/posts/${post.slug}`} className="home-post-card">
                {post.coverImage ? (
                  <img
                    src={post.coverImage}
                    alt={post.title}
                    className="home-post-cover"
                  />
                ) : (
                  <div className="home-post-cover placeholder">🎮</div>
                )}

                <div className="home-post-body">
                  <div className="home-post-meta">
                    {post.author?.username ?? "Пользователь"}
                    {post.category?.title ? ` • ${post.category.title}` : ""}
                  </div>

                  <div className="home-post-title">{post.title}</div>
                  <div className="home-post-excerpt">{getExcerpt(post.content)}</div>

                  {post.tags?.length ? (
                    <div className="home-post-tags">
                      {post.tags.slice(0, 4).map((tag) => (
                        <span key={tag.id} className="home-post-tag">
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
      </section>

      <section className="container home-cta">
        <div className="home-cta-card">
          <div>
            <div className="home-section-kicker">GameHelp</div>
            <h2 className="home-section-title">Готов начать общение?</h2>
            <p className="home-cta-text">
              Зарегистрируйся, публикуй посты, комментируй темы, добавляй друзей и общайся с игроками.
            </p>
          </div>

          <div className="home-cta-actions">
            {session ? (
              <>
                <Link href="/posts/new" className="home-button primary">
                  Создать пост
                </Link>
                <Link href="/messages" className="home-button secondary">
                  Сообщения
                </Link>
              </>
            ) : (
              <>
                <Link href="/auth/register" className="home-button primary">
                  Зарегистрироваться
                </Link>
                <Link href="/auth/login" className="home-button secondary">
                  Войти в аккаунт
                </Link>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}