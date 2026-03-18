"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { apiRequest } from "@/lib/api";
import styles from "./FriendsClient.module.css";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
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

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      setMessage("");

      const [meResult, friendsResult, requestsResult] = await Promise.all([
        apiRequest(`/users/me/${userId}`),
        apiRequest(`/friends/list/${userId}`),
        apiRequest(`/friends/requests/${userId}`),
      ]);

      setMe(meResult.user ?? null);
      setFriends(friendsResult.friends ?? []);
      setRequests(requestsResult.requests ?? []);
    } catch (error) {
      const text = error instanceof Error ? error.message : "Ошибка загрузки";
      setMessage(text);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const searchUsers = useCallback(async () => {
    try {
      setMessage("");

      const q = searchValue.trim();
      if (!q) {
        setFound([]);
        return;
      }

      const result = await apiRequest("/users/search", {
        query: {
          q,
          viewerId: userId,
        },
      });

      setFound(result.users ?? []);
    } catch (error) {
      const text = error instanceof Error ? error.message : "Ошибка поиска";
      setMessage(text);
    }
  }, [searchValue, userId]);

  async function sendDirectRequest() {
    try {
      setMessage("");

      const value = directValue.trim();
      if (!value) {
        setMessage("Введи UUID пользователя");
        return;
      }

      if (!isUuid(value)) {
        setMessage("Здесь поддерживается только UUID пользователя");
        return;
      }

      const result = await apiRequest("/friends/request", {
        method: "POST",
        body: JSON.stringify({
          userId,
          targetId: value,
        }),
      });

      if (result.status === "incoming") {
        setMessage(
          result.message ??
            "У вас уже есть входящая заявка от этого пользователя."
        );
      } else if (result.status === "accepted") {
        setMessage("Вы уже друзья ✅");
      } else {
        setMessage("Заявка отправлена ⏳");
      }

      setDirectValue("");
      await loadAll();
    } catch (error) {
      const text =
        error instanceof Error ? error.message : "Ошибка отправки заявки";
      setMessage(text);
    }
  }

  async function addById(targetId: string) {
    try {
      setMessage("");

      const result = await apiRequest("/friends/request", {
        method: "POST",
        body: JSON.stringify({
          userId,
          targetId,
        }),
      });

      if (result.status === "incoming") {
        setMessage(
          result.message ??
            "У вас уже есть входящая заявка от этого пользователя."
        );
      } else if (result.status === "accepted") {
        setMessage("Вы уже друзья ✅");
      } else {
        setMessage("Заявка отправлена ⏳");
      }

      await loadAll();
      await searchUsers();
    } catch (error) {
      const text = error instanceof Error ? error.message : "Ошибка";
      setMessage(text);
    }
  }

  async function accept(requesterId: string) {
    try {
      setMessage("");

      await apiRequest("/friends/accept", {
        method: "POST",
        body: JSON.stringify({
          userId,
          requesterId,
        }),
      });

      setMessage("Заявка принята ✅");
      await loadAll();
      await searchUsers();
    } catch (error) {
      const text = error instanceof Error ? error.message : "Ошибка";
      setMessage(text);
    }
  }

  async function remove(targetId: string) {
    try {
      setMessage("");

      await apiRequest("/friends/remove", {
        method: "POST",
        body: JSON.stringify({
          userId,
          targetId,
        }),
      });

      setMessage("Пользователь удалён из друзей");
      await loadAll();
      await searchUsers();
    } catch (error) {
      const text = error instanceof Error ? error.message : "Ошибка";
      setMessage(text);
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
              Ищи человека по нику или UUID.
            </p>
          </div>

          <Link href="/profile" className={styles.backButton}>
            ← Профиль
          </Link>
        </div>

        {me?.id ? (
          <div className={styles.codeCard}>
            <div className={styles.codeLabel}>Твой UUID</div>
            <div className={styles.codeValue}>{me.id}</div>
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
                placeholder="UUID пользователя"
              />
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => void sendDirectRequest()}
              >
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
                placeholder="Ник или UUID"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    void searchUsers();
                  }
                }}
              />
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => void searchUsers()}
              >
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
                {found.map((user: any) => (
                  <div key={user.id} className={styles.userCard}>
                    <div className={styles.userInfo}>
                      {user.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt={user.username}
                          className={styles.userAvatar}
                        />
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
                          onClick={() => void remove(user.id)}
                        >
                          Удалить
                        </button>
                      ) : user.friendStatus === "incoming" ? (
                        <button
                          type="button"
                          className={styles.primaryButton}
                          onClick={() => void accept(user.id)}
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
                          onClick={() => void addById(user.id)}
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
                  {requests.map((row: any) => (
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
                        onClick={() => void accept(row.from.id)}
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
                  {friends.map((friend: any) => (
                    <div key={friend.id} className={styles.smallCard}>
                      <div>
                        <Link href={`/u/${friend.id}`} className={styles.userName}>
                          {friend.username}
                        </Link>
                        <div className={styles.userMeta}>ID: {friend.id}</div>
                      </div>

                      <button
                        type="button"
                        className={styles.dangerButton}
                        onClick={() => void remove(friend.id)}
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