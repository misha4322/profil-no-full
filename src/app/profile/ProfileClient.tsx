"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { apiRequest } from "@/lib/api";
import styles from "./ProfileClient.module.css";

function splitFavoriteGames(value: string | null | undefined) {
  if (!value) {
    return [];
  }

  return value
    .split(/[\n,]/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function ProfileClient({ userId }: { userId: string }) {
  const [data, setData] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    try {
      const result = await apiRequest(`/users/me/${userId}`);
      setData(result);
    } catch (error) {
      const text = error instanceof Error ? error.message : "Ошибка загрузки профиля";
      setMessage(text);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function copyId() {
    try {
      await navigator.clipboard.writeText(userId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setMessage("Не удалось скопировать ID");
    }
  }

  const favoriteGames = useMemo(
    () => splitFavoriteGames(data?.user?.favoriteGames),
    [data]
  );

  if (!data && message) {
    return (
      <div className={styles.page}>
        <div className={styles.errorBox}>{message}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingBox}>Загрузка профиля...</div>
      </div>
    );
  }

  const { user, counts, recentPosts } = data;

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {user.profileBannerUrl ? (
          <img src={user.profileBannerUrl} alt="banner" className={styles.banner} />
        ) : (
          <div className={styles.bannerPlaceholder} />
        )}

        <div className={styles.hero}>
          <div className={styles.avatarWrap}>
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.username} className={styles.avatar} />
            ) : (
              <div className={styles.avatarPlaceholder}>
                {(user.username?.[0] ?? "U").toUpperCase()}
              </div>
            )}
          </div>

          <div className={styles.heroInfo}>
            <div className={styles.topRow}>
              <h1 className={styles.title}>{user.username}</h1>

              <span className={styles.badge}>
                {user.isProfilePrivate ? "Приватный профиль" : "Публичный профиль"}
              </span>
            </div>

            {user.statusText ? <div className={styles.status}>{user.statusText}</div> : null}

            <div className={styles.meta}>
              <span>ID: {user.id}</span>
              {user.createdAt ? (
                <span>
                  На сайте с {new Date(user.createdAt).toLocaleDateString("ru-RU")}
                </span>
              ) : null}
            </div>

            <div className={styles.actions}>
              <button
                className={styles.primaryButton}
                type="button"
                onClick={() => void copyId()}
              >
                {copied ? "✅ ID скопирован" : "📋 Скопировать ID"}
              </button>

              <Link href="/settings" className={styles.secondaryButton}>
                ⚙️ Настройки
              </Link>

              <Link href="/friends" className={styles.secondaryButton}>
                🤝 Друзья
              </Link>

              <Link href="/messages" className={styles.secondaryButton}>
                💬 Сообщения
              </Link>
            </div>
          </div>
        </div>

        {message ? <div className={styles.message}>{message}</div> : null}

        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{counts.posts}</div>
            <div className={styles.statLabel}>Постов</div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statValue}>{counts.comments}</div>
            <div className={styles.statLabel}>Комментариев</div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statValue}>{counts.friends}</div>
            <div className={styles.statLabel}>Друзей</div>
          </div>
        </div>

        <div className={styles.columns}>
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>О себе</h2>

            {user.bio ? (
              <div className={styles.bio}>{user.bio}</div>
            ) : (
              <div className={styles.emptyBox}>Пока описание не заполнено.</div>
            )}

            <div className={styles.infoList}>
              {user.location ? <div>📍 {user.location}</div> : null}
              {user.email ? <div>✉️ {user.email}</div> : null}
              {user.websiteUrl ? (
                <a href={user.websiteUrl} target="_blank" rel="noreferrer" className={styles.link}>
                  🌐 {user.websiteUrl}
                </a>
              ) : null}
              {user.telegram ? <div>📨 {user.telegram}</div> : null}
              {user.discord ? <div>🎧 {user.discord}</div> : null}
              {user.steamProfileUrl ? (
                <a
                  href={user.steamProfileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.link}
                >
                  🎮 Steam профиль
                </a>
              ) : null}
            </div>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Любимые игры</h2>

            {!favoriteGames.length ? (
              <div className={styles.emptyBox}>Список любимых игр пуст.</div>
            ) : (
              <div className={styles.tags}>
                {favoriteGames.map((game) => (
                  <span key={game} className={styles.tag}>
                    {game}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Последние посты</h2>
            <Link href="/posts" className={styles.sectionLink}>
              Все посты →
            </Link>
          </div>

          {recentPosts.length === 0 ? (
            <div className={styles.emptyBox}>Пока нет опубликованных постов.</div>
          ) : (
            <div className={styles.postsGrid}>
              {recentPosts.map((post: any) => (
                <Link key={post.id} href={`/posts/${post.slug}`} className={styles.postCard}>
                  {post.coverImage ? (
                    <img src={post.coverImage} alt={post.title} className={styles.postImage} />
                  ) : (
                    <div className={styles.postImagePlaceholder}>🎮</div>
                  )}

                  <div className={styles.postBody}>
                    <div className={styles.postTitle}>{post.title}</div>
                    <div className={styles.postDate}>
                      {post.createdAt
                        ? new Date(post.createdAt).toLocaleString("ru-RU")
                        : "—"}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}