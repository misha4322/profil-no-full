"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Me = { user: { id: string; username: string; avatarUrl: string | null; friendCode: string | null } };
type U = { id: string; username: string; avatarUrl: string | null; friendCode?: string | null };
type RequestRow = { from: U; createdAt: string | null };

export default function FriendsClient() {
  const [me, setMe] = useState<Me["user"] | null>(null);
  const [q, setQ] = useState("");
  const [found, setFound] = useState<U[]>([]);
  const [code, setCode] = useState("");
  const [friends, setFriends] = useState<U[]>([]);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  async function loadAll() {
    setMsg(null);
    const mRes = await fetch("/api/users/me", { cache: "no-store" });
    const mJson = await mRes.json();
    if (!mRes.ok) { setMsg(mJson?.error ?? "Ошибка"); return; }
    setMe(mJson.user);

    const fr = await fetch("/api/friends/list", { cache: "no-store" });
    const frj = await fr.json();
    setFriends(fr.ok ? (frj.friends ?? []) : []);

    const rr = await fetch("/api/friends/requests", { cache: "no-store" });
    const rrj = await rr.json();
    setRequests(rr.ok ? (rrj.requests ?? []) : []);
  }

  useEffect(() => { loadAll(); }, []);

  async function search() {
    setMsg(null);
    const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { setMsg(j?.error ?? "Ошибка поиска"); return; }
    setFound(j.users ?? []);
  }

  async function addByCode() {
    setMsg(null);
    const res = await fetch("/api/friends/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code.trim() }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { setMsg(j?.error ?? "Ошибка"); return; }
    setMsg(j.status === "accepted" ? "Теперь вы друзья ✅" : "Заявка отправлена ⏳");
    setCode("");
    await loadAll();
  }

  async function addById(targetId: string) {
    setMsg(null);
    const res = await fetch("/api/friends/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetId }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { setMsg(j?.error ?? "Ошибка"); return; }
    setMsg(j.status === "accepted" ? "Теперь вы друзья ✅" : "Заявка отправлена ⏳");
    await loadAll();
  }

  async function accept(requesterId: string) {
    const res = await fetch("/api/friends/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requesterId }),
    });
    await res.json().catch(() => ({}));
    await loadAll();
  }

  async function remove(targetId: string) {
    const res = await fetch("/api/friends/remove", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetId }),
    });
    await res.json().catch(() => ({}));
    await loadAll();
  }

  return (
    <div style={{ padding: 24, color: "white" }}>
      <h1>🤝 Друзья</h1>

      {me?.friendCode ? (
        <div style={{ marginTop: 12, padding: 12, border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12 }}>
          <div style={{ opacity: 0.8 }}>Твой код (как Steam):</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{me.friendCode}</div>
        </div>
      ) : null}

      <div style={{ marginTop: 16 }}>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Код друга: 1234-5678"
          style={{ padding: 10, borderRadius: 10, width: 260 }}
        />
        <button onClick={addByCode} style={{ marginLeft: 10, padding: 10, borderRadius: 10 }}>
          Добавить по коду
        </button>
      </div>

      <div style={{ marginTop: 16 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Поиск по нику"
          style={{ padding: 10, borderRadius: 10, width: 260 }}
        />
        <button onClick={search} style={{ marginLeft: 10, padding: 10, borderRadius: 10 }}>
          Найти
        </button>
      </div>

      {msg ? <div style={{ marginTop: 12, color: "#ffd" }}>{msg}</div> : null}

      <div style={{ marginTop: 18 }}>
        <h3>Результаты поиска</h3>
        {found.map((u) => (
          <div key={u.id} style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 8 }}>
            <Link href={`/u/${u.id}`} style={{ color: "white", textDecoration: "none" }}>
              {u.username} {u.friendCode ? `(${u.friendCode})` : ""}
            </Link>
            <button onClick={() => addById(u.id)} style={{ padding: 8, borderRadius: 10 }}>
              ➕ Добавить
            </button>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 18 }}>
        <h3>Входящие заявки</h3>
        {requests.map((r) => (
          <div key={r.from.id} style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 8 }}>
            <Link href={`/u/${r.from.id}`} style={{ color: "white", textDecoration: "none" }}>
              {r.from.username}
            </Link>
            <button onClick={() => accept(r.from.id)} style={{ padding: 8, borderRadius: 10 }}>
              ✅ Принять
            </button>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 18 }}>
        <h3>Мои друзья</h3>
        {friends.map((f) => (
          <div key={f.id} style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 8 }}>
            <Link href={`/u/${f.id}`} style={{ color: "white", textDecoration: "none" }}>
              {f.username}
            </Link>
            <button onClick={() => remove(f.id)} style={{ padding: 8, borderRadius: 10 }}>
              ❌ Удалить
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}