"use client";

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
  }

  useEffect(() => {
    load();
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
            </div>
          </>
        )}
      </div>
    </div>
  );
}