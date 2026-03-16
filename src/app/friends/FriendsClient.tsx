"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./FriendsClient.module.css";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function isFriendCode(value: string) {
  return /^\d{4}-\d{4}$/i.test(value.trim());
}

async function readJsonSafe(res: Response) {
  const text = await res.text();

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Сервер вернул не JSON. Проверь маршрут: ${res.url}`);
  }
}

export default function FriendsClient({ userId }: { userId: string }) {
  const [me, setMe] = useState<any>(null);
  const [searchValue, setSearchValue] = useState("");
  const [directValue, setDirectValue] = useState("");
  const [friends, setFriends] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [found, setFound] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadAll() {
    try {
      setLoading(true);

      const [meRes, friendsRes, requestsRes] = await Promise.all([
        fetch(`/api/users/me/${userId}`, { cache: "no-store" }),
        fetch(`/api/friends/list/${userId}`, { cache: "no-store" }),
        fetch(`/api/friends/requests/${userId}`, { cache: "no-store" }),
      ]);

      const meJson = await readJsonSafe(meRes);
      const friendsJson = await readJsonSafe(friendsRes);
      const requestsJson = await readJsonSafe(requestsRes);

      if (!meRes.ok) {
        throw new Error(meJson?.error || "Ошибка загрузки профиля");
      }

      setMe(meJson.user);
      setFriends(friendsRes.ok ? (friendsJson.friends ?? []) : []);
      setRequests(requestsRes.ok ? (requestsJson.requests ?? []) : []);
    } catch (error: any) {
      setMessage(error?.message || "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, [userId]);

  async function searchUsers() {
    try {
      setMessage("");

      const q = searchValue.trim();
      if (!q) {
        setFound([]);
        return;
      }

      const res = await fetch(
        `/api/users/search?q=${encodeURIComponent(q)}&viewerId=${encodeURIComponent(userId)}`
      );

      const json = await readJsonSafe(res);

      if (!res.ok) {
        throw new Error(json?.error || "Ошибка поиска");
      }

      setFound(json.users ?? []);
    } catch (error: any) {
      setMessage(error?.message || "Ошибка поиска");
    }
  }

  async function sendDirectRequest() {
    try {
      setMessage("");

      const value = directValue.trim();
      if (!value) {
        setMessage("Введи UUID или код друга");
        return;
      }

      const body: Record<string, string> = { userId };

      if (isUuid(value)) {
        body.targetId = value;
      } else if (isFriendCode(value)) {
        body.code = value.toUpperCase();
      } else {
        setMessage("Поддерживается UUID или код вида 1234-5678");
        return;
      }

      const res = await fetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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

      setDirectValue("");
      await loadAll();
    } catch (error: any) {
      setMessage(error?.message || "Ошибка отправки заявки");
    }
  }

  async function addById(targetId: string) {
    try {
      setMessage("");

      const res = await fetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, targetId }),
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

      await loadAll();
      await searchUsers();
    } catch (error: any) {
      setMessage(error?.message || "Ошибка");
    }
  }

  async function accept(requesterId: string) {
    try {
      setMessage("");

      const res = await fetch("/api/friends/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, requesterId }),
      });

      const json = await readJsonSafe(res);

      if (!res.ok) {
        throw new Error(json?.error || "Ошибка принятия заявки");
      }

      setMessage("Заявка принята ✅");
      await loadAll();
      await searchUsers();
    } catch (error: any) {
      setMessage(error?.message || "Ошибка");
    }
  }

  async function remove(targetId: string) {
    try {
      setMessage("");

      const res = await fetch("/api/friends/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, targetId }),
      });

      const json = await readJsonSafe(res);

      if (!res.ok) {
        throw new Error(json?.error || "Ошибка удаления");
      }

      setMessage("Пользователь удалён из друзей");
      await loadAll();
      await searchUsers();
    } catch (error: any) {
      setMessage(error?.message || "Ошибка");
    }
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.box}>Загрузка друзей...</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Друзья и поиск людей</h1>
            <p className={styles.subtitle}>
              Ищи человека по нику, UUID или коду друга.
            </p>
          </div>

          <Link href="/profile" className={styles.backButton}>
            ← Профиль
          </Link>
        </div>

        {me?.friendCode ? (
          <div className={styles.codeCard}>
            <div className={styles.codeLabel}>Твой код друга</div>
            <div className={styles.codeValue}>{me.friendCode}</div>
            <div className={styles.codeSub}>UUID: {me.id}</div>
          </div>
        ) : null}

        <div className={styles.topGrid}>
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Быстрое добавление</h2>

            <div className={styles.row}>
              <input
                value={directValue}
                onChange={(e) => setDirectValue(e.target.value)}
                className={styles.input}
                placeholder="UUID или код 1234-5678"
              />
              <button type="button" className={styles.primaryButton} onClick={sendDirectRequest}>
                Добавить
              </button>
            </div>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Поиск</h2>

            <div className={styles.row}>
              <input
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className={styles.input}
                placeholder="Ник, UUID или код друга"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    void searchUsers();
                  }
                }}
              />
              <button type="button" className={styles.secondaryButton} onClick={searchUsers}>
                Найти
              </button>
            </div>
          </div>
        </div>

        {message ? <div className={styles.message}>{message}</div> : null}

        <div className={styles.mainGrid}>
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Результаты поиска</h2>

            {!found.length ? (
              <div className={styles.empty}>Ничего не найдено.</div>
            ) : (
              <div className={styles.list}>
                {found.map((user) => (
                  <div key={user.id} className={styles.userCard}>
                    <div className={styles.userInfo}>
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt={user.username} className={styles.userAvatar} />
                      ) : (
                        <div className={styles.userAvatarPlaceholder}>
                          {(user.username?.[0] ?? "U").toUpperCase()}
                        </div>
                      )}

                      <div>
                        <Link href={`/u/${user.id}`} className={styles.userName}>
                          {user.username}
                        </Link>
                        <div className={styles.userMeta}>ID: {user.id}</div>
                        {user.friendCode ? (
                          <div className={styles.userMeta}>Код: {user.friendCode}</div>
                        ) : null}
                        <div className={styles.userMeta}>
                          {user.isProfilePrivate ? "Профиль закрыт" : "Профиль открыт"}
                        </div>
                      </div>
                    </div>

                    <div className={styles.userActions}>
                      {user.friendStatus === "self" ? (
                        <button type="button" className={styles.disabledButton} disabled>
                          Это вы
                        </button>
                      ) : user.friendStatus === "friends" ? (
                        <button
                          type="button"
                          className={styles.dangerButton}
                          onClick={() => remove(user.id)}
                        >
                          Удалить
                        </button>
                      ) : user.friendStatus === "incoming" ? (
                        <button
                          type="button"
                          className={styles.primaryButton}
                          onClick={() => accept(user.id)}
                        >
                          Принять
                        </button>
                      ) : user.friendStatus === "outgoing" ? (
                        <button type="button" className={styles.disabledButton} disabled>
                          Заявка отправлена
                        </button>
                      ) : (
                        <button
                          type="button"
                          className={styles.primaryButton}
                          onClick={() => addById(user.id)}
                        >
                          Добавить
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={styles.sideColumn}>
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Входящие заявки</h2>

              {!requests.length ? (
                <div className={styles.empty}>Нет заявок.</div>
              ) : (
                <div className={styles.list}>
                  {requests.map((row) => (
                    <div key={row.from.id} className={styles.smallCard}>
                      <div>
                        <Link href={`/u/${row.from.id}`} className={styles.userName}>
                          {row.from.username}
                        </Link>
                        <div className={styles.userMeta}>ID: {row.from.id}</div>
                      </div>

                      <button
                        type="button"
                        className={styles.primaryButton}
                        onClick={() => accept(row.from.id)}
                      >
                        Принять
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Мои друзья</h2>

              {!friends.length ? (
                <div className={styles.empty}>Список друзей пуст.</div>
              ) : (
                <div className={styles.list}>
                  {friends.map((friend) => (
                    <div key={friend.id} className={styles.smallCard}>
                      <div>
                        <Link href={`/u/${friend.id}`} className={styles.userName}>
                          {friend.username}
                        </Link>
                        <div className={styles.userMeta}>ID: {friend.id}</div>
                        {friend.friendCode ? (
                          <div className={styles.userMeta}>Код: {friend.friendCode}</div>
                        ) : null}
                      </div>

                      <button
                        type="button"
                        className={styles.dangerButton}
                        onClick={() => remove(friend.id)}
                      >
                        Удалить
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}