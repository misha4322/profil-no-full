"use client";

<<<<<<< HEAD
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import styles from "./UserClient.module.css";

async function readJsonSafe(res: Response) {
  const text = await res.text();

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Сервер вернул не JSON. Проверь маршрут: ${res.url}`);
  }
}

function splitFavoriteGames(value: string | null | undefined) {
  if (!value) return [];
  return value
    .split(/[\n,]/g)
    .map((item) => item.trim())
    .filter(Boolean);
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
=======
import { useEffect, useState } from "react";

type UserResp = {
  user: { id: string; username: string; avatarUrl: string | null; isProfilePrivate: boolean };
  canView: boolean;
  friendStatus: "self" | "friends" | "incoming" | "outgoing" | "none";
};

export default function UserProfileClient({ userId }: { userId: string }) {
  const [data, setData] = useState<UserResp | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    setMsg(null);
    const res = await fetch(`/api/users/${userId}`, { cache: "no-store" });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg(j?.error ?? "Ошибка");
      return;
    }
    setData(j);
>>>>>>> e55ac280fb05062c9959b150f067539a31286f1d
  }

  useEffect(() => {
    load();
<<<<<<< HEAD
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

  const { user, friendStatus, canView, counts, recentPosts } = data;

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {user.profileBannerUrl ? (
          <img src={user.profileBannerUrl} alt="banner" className={styles.banner} />
        ) : (
          <div className={styles.bannerPlaceholder} />
        )}

        <div className={styles.header}>
          <Link href="/friends" className={styles.backButton}>
            ← К поиску людей
          </Link>

          <div className={styles.headerActions}>
            {friendStatus === "self" ? (
              <Link href="/settings" className={styles.primaryButton}>
                Настройки профиля
              </Link>
            ) : friendStatus === "friends" ? (
              <>
                <Link href={`/messages?with=${user.id}`} className={styles.secondaryButton}>
                  💬 Написать
                </Link>
                <button
                  type="button"
                  className={styles.dangerButton}
                  onClick={removeFriend}
                >
                  Удалить из друзей
                </button>
              </>
            ) : friendStatus === "incoming" ? (
              <button
                type="button"
                className={styles.primaryButton}
                onClick={acceptFriend}
              >
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

            {user.statusText ? <div className={styles.status}>{user.statusText}</div> : null}

            <div className={styles.meta}>
              <span>ID: {user.id}</span>
              {user.createdAt ? (
                <span>
                  На сайте с {new Date(user.createdAt).toLocaleDateString("ru-RU")}
                </span>
              ) : null}
            </div>

            <div className={styles.meta}>
              {user.isProfilePrivate ? (
                <span>Профиль закрытый</span>
              ) : (
                <span>Профиль открытый</span>
              )}
              {user.friendCode ? <span>Код друга: {user.friendCode}</span> : null}
              {user.email ? <span>Email: {user.email}</span> : null}
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
            🔒 Этот профиль закрыт. Полное содержимое видно только друзьям.
          </div>
        ) : (
          <>
            <div className={styles.columns}>
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>О пользователе</h2>

                {user.bio ? (
                  <div className={styles.bio}>{user.bio}</div>
                ) : (
                  <div className={styles.emptyBox}>Пока описание не заполнено.</div>
                )}

                <div className={styles.infoList}>
                  {user.location ? <div>📍 {user.location}</div> : null}
                  {user.websiteUrl ? (
                    <a
                      href={user.websiteUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={styles.link}
                    >
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
              <h2 className={styles.sectionTitle}>Последние посты</h2>

              {recentPosts.length === 0 ? (
                <div className={styles.emptyBox}>У пользователя пока нет опубликованных постов.</div>
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
=======
  }, [userId]);

  async function addFriend() {
    const res = await fetch("/api/friends/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetId: userId }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) setMsg(j?.error ?? "Ошибка");
    else if (j?.status === "incoming") setMsg(j?.message ?? "Есть входящая заявка — нажмите «Принять»");
    await load();
  }

  async function acceptFriend() {
    const res = await fetch("/api/friends/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requesterId: userId }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) setMsg(j?.error ?? "Ошибка");
    await load();
  }

  async function removeFriend() {
    const res = await fetch("/api/friends/remove", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetId: userId }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) setMsg(j?.error ?? "Ошибка");
    await load();
  }

  if (msg) return <div style={{ padding: 24, color: "white" }}>{msg}</div>;
  if (!data) return <div style={{ padding: 24, color: "white" }}>Загрузка...</div>;

  const { user, canView, friendStatus } = data;

  return (
    <div style={{ padding: 24, color: "white" }}>
      {/* ✅ Аватар и ник всегда */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        {user.avatarUrl ? (
          // проще и надежнее чем next/image (без remotePatterns)
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatarUrl}
            alt={user.username}
            style={{ width: 64, height: 64, borderRadius: 16, objectFit: "cover" }}
          />
        ) : (
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "rgba(255,255,255,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 900,
              fontSize: 24,
            }}
          >
            {(user.username?.[0] ?? "U").toUpperCase()}
          </div>
        )}

        <div>
          <div style={{ fontSize: 26, fontWeight: 900 }}>{user.username}</div>
          <div style={{ opacity: 0.75 }}>ID: {user.id}</div>
        </div>
      </div>

      <div style={{ marginTop: 18 }}>
        {!canView ? (
          <>
            <p>🔒 Профиль закрыт. Откроется после дружбы.</p>

            {friendStatus === "incoming" ? (
              <button onClick={acceptFriend}>✅ Принять заявку</button>
            ) : friendStatus === "outgoing" ? (
              <button disabled>⏳ Заявка отправлена</button>
            ) : friendStatus === "friends" ? (
              <button onClick={removeFriend}>❌ Удалить из друзей</button>
            ) : friendStatus === "self" ? null : (
              <button onClick={addFriend}>➕ Добавить в друзья</button>
            )}
          </>
        ) : (
          <>
            <p>Профиль открыт ✅</p>

            {friendStatus === "friends" ? (
              <button onClick={removeFriend}>❌ Удалить из друзей</button>
            ) : friendStatus === "incoming" ? (
              <button onClick={acceptFriend}>✅ Принять заявку</button>
            ) : friendStatus === "outgoing" ? (
              <button disabled>⏳ Заявка отправлена</button>
            ) : friendStatus === "self" ? null : (
              <button onClick={addFriend}>➕ Добавить в друзья</button>
            )}

            {/* тут уже твоя реальная инфа профиля */}
            <div style={{ marginTop: 14, opacity: 0.85 }}>
              Тут будет контент профиля (игры, достижения и т.д.)
>>>>>>> e55ac280fb05062c9959b150f067539a31286f1d
            </div>
          </>
        )}
      </div>
    </div>
  );
}