"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./UserClient.module.css";

async function readJsonSafe(res: Response) {
  const text = await res.text();

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Сервер вернул не JSON. Проверь маршрут: ${res.url}`);
  }
}

export default function UserClient({
  userId,
  viewerId,
}: {
  userId: string;
  viewerId: string | null;
}) {
  const [data, setData] = useState<any>(null);
  const [message, setMessage] = useState("");

  async function load() {
    try {
      setMessage("");

      const url = viewerId
        ? `/api/users/${userId}?viewerId=${encodeURIComponent(viewerId)}`
        : `/api/users/${userId}`;

      const res = await fetch(url, { cache: "no-store" });
      const json = await readJsonSafe(res);

      if (!res.ok) {
        throw new Error(json?.error || "Ошибка загрузки профиля");
      }

      setData(json);
    } catch (error: any) {
      setMessage(error?.message || "Ошибка");
    }
  }

  useEffect(() => {
    load();
  }, [userId, viewerId]);

  async function addFriend() {
    if (!viewerId) {
      setMessage("Сначала войди в аккаунт");
      return;
    }

    try {
      const res = await fetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: viewerId, targetId: userId }),
      });

      const json = await readJsonSafe(res);

      if (!res.ok) {
        throw new Error(json?.error || "Ошибка отправки заявки");
      }

      if (json?.status === "incoming") {
        setMessage(json?.message || "Есть входящая заявка — нажми принять.");
      } else if (json?.status === "accepted") {
        setMessage("Вы уже друзья ✅");
      } else {
        setMessage("Заявка отправлена ⏳");
      }

      await load();
    } catch (error: any) {
      setMessage(error?.message || "Ошибка");
    }
  }

  async function acceptFriend() {
    if (!viewerId) {
      setMessage("Сначала войди в аккаунт");
      return;
    }

    try {
      const res = await fetch("/api/friends/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: viewerId, requesterId: userId }),
      });

      const json = await readJsonSafe(res);

      if (!res.ok) {
        throw new Error(json?.error || "Ошибка принятия заявки");
      }

      setMessage("Заявка принята ✅");
      await load();
    } catch (error: any) {
      setMessage(error?.message || "Ошибка");
    }
  }

  async function removeFriend() {
    if (!viewerId) {
      setMessage("Сначала войди в аккаунт");
      return;
    }

    try {
      const res = await fetch("/api/friends/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: viewerId, targetId: userId }),
      });

      const json = await readJsonSafe(res);

      if (!res.ok) {
        throw new Error(json?.error || "Ошибка удаления");
      }

      setMessage("Пользователь удалён из друзей");
      await load();
    } catch (error: any) {
      setMessage(error?.message || "Ошибка");
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

  const { user, friendStatus, canView, counts, recentPosts } = data;

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <Link href="/friends" className={styles.backButton}>
            ← К поиску людей
          </Link>

          {friendStatus === "self" ? (
            <Link href="/settings" className={styles.primaryButton}>
              Настройки профиля
            </Link>
          ) : friendStatus === "friends" ? (
            <button type="button" className={styles.dangerButton} onClick={removeFriend}>
              Удалить из друзей
            </button>
          ) : friendStatus === "incoming" ? (
            <button type="button" className={styles.primaryButton} onClick={acceptFriend}>
              Принять заявку
            </button>
          ) : friendStatus === "outgoing" ? (
            <button type="button" className={styles.disabledButton} disabled>
              Заявка отправлена
            </button>
          ) : (
            <button type="button" className={styles.primaryButton} onClick={addFriend}>
              Добавить в друзья
            </button>
          )}
        </div>

        <div className={styles.hero}>
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.username} className={styles.avatar} />
          ) : (
            <div className={styles.avatarPlaceholder}>
              {(user.username?.[0] ?? "U").toUpperCase()}
            </div>
          )}

          <div className={styles.heroInfo}>
            <h1 className={styles.title}>{user.username}</h1>

            <div className={styles.meta}>
              <span>ID: {user.id}</span>
              {user.friendCode ? <span>Код друга: {user.friendCode}</span> : null}
            </div>

            <div className={styles.meta}>
              <span>{user.isProfilePrivate ? "Профиль закрыт" : "Профиль открыт"}</span>
              {user.createdAt ? (
                <span>С нами с {new Date(user.createdAt).toLocaleDateString("ru-RU")}</span>
              ) : null}
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

        {!canView ? (
          <div className={styles.privateBox}>
            🔒 Этот профиль закрыт. Полное содержимое видно друзьям.
          </div>
        ) : (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Последние посты</h2>

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
        )}
      </div>
    </div>
  );
}