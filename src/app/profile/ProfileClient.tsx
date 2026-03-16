"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./ProfileClient.module.css";

async function readJsonSafe(res: Response) {
  const text = await res.text();

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Сервер вернул не JSON. Проверь маршрут: ${res.url}`);
  }
}

export default function ProfileClient({ userId }: { userId: string }) {
  const [data, setData] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/users/me/${userId}`, { cache: "no-store" });
        const json = await readJsonSafe(res);

        if (!res.ok) {
          throw new Error(json?.error || "Ошибка загрузки профиля");
        }

        setData(json);
      } catch (error: any) {
        setMessage(error?.message || "Ошибка загрузки профиля");
      }
    })();
  }, [userId]);

  async function copyId() {
    try {
      await navigator.clipboard.writeText(userId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setMessage("Не удалось скопировать ID");
    }
  }

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
                {user.isProfilePrivate ? "Приватный профиль" : "Открытый профиль"}
              </span>
            </div>

            <div className={styles.meta}>
              <span>ID: {user.id}</span>
              {user.friendCode ? <span>Код друга: {user.friendCode}</span> : null}
            </div>

            {user.email ? <div className={styles.email}>{user.email}</div> : null}

            <div className={styles.actions}>
              <button className={styles.primaryButton} type="button" onClick={copyId}>
                {copied ? "✅ ID скопирован" : "📋 Скопировать ID"}
              </button>

              <Link href="/settings" className={styles.secondaryButton}>
                ⚙️ Настройки
              </Link>

              <Link href="/friends" className={styles.secondaryButton}>
                🤝 Друзья
              </Link>

              <Link href="/posts/new" className={styles.secondaryButton}>
                ➕ Новый пост
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
                      {post.createdAt ? new Date(post.createdAt).toLocaleString("ru-RU") : "—"}
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