"use client";

import { useEffect, useMemo, useState } from "react";

type MeResponse = {
  user: { id: string; username: string; email: string | null; avatarUrl: string | null };
};

export default function SettingsClient() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState<string | null>(null);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const previewSrc = useMemo(() => localPreview ?? avatarUrl, [localPreview, avatarUrl]);

  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/users/me", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load profile");
        const data: MeResponse = await res.json();
        setUsername(data.user.username);
        setEmail(data.user.email);
        setAvatarUrl(data.user.avatarUrl);
      } catch (e: any) {
        setMsg(e?.message ?? "Ошибка загрузки профиля");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function uploadAvatar() {
    if (!selectedFile) return;

    setMsg(null);
    const form = new FormData();
    form.append("file", selectedFile);

    const res = await fetch("/api/upload", { method: "POST", body: form });
    const data = await res.json();

    if (!res.ok) {
      setMsg(data?.error ?? "Ошибка загрузки файла");
      return;
    }

    const url = data?.urls?.[0] as string | undefined;
    if (!url) {
      setMsg("Upload: пустой ответ");
      return;
    }

    setAvatarUrl(url);
    setLocalPreview(null);
    setSelectedFile(null);
    setMsg("Аватар загружен. Не забудь нажать «Сохранить».");
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, avatarUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data?.error ?? "Ошибка сохранения");
        return;
      }
      setMsg("Сохранено ✅ (профиль обновится сразу)");
    } catch (e: any) {
      setMsg(e?.message ?? "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="settings-wrap">
        <div className="settings-card">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="settings-wrap">
      <div className="settings-card">
        <h1 className="settings-title">Настройки профиля</h1>

        <div className="settings-row">
          <div className="settings-avatar">
            {previewSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewSrc} alt="avatar" className="avatar-img" />
            ) : (
              <div className="avatar-placeholder">
                {(username?.[0] ?? "G").toUpperCase()}
              </div>
            )}
          </div>

          <div className="settings-avatar-actions">
            <label className="btn">
              Выбрать фото
              <input
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setSelectedFile(f);
                  setMsg(null);
                  if (f) setLocalPreview(URL.createObjectURL(f));
                }}
              />
            </label>

            <button className="btn btn-primary" onClick={uploadAvatar} disabled={!selectedFile}>
              Загрузить
            </button>

            <button
              className="btn btn-danger"
              onClick={() => {
                setAvatarUrl(null);
                setLocalPreview(null);
                setSelectedFile(null);
                setMsg("Аватар сброшен. Нажми «Сохранить».");
              }}
            >
              Удалить
            </button>

            <div className="hint">PNG/JPG/WEBP до 5MB</div>
          </div>
        </div>


        <div className="field">
          <div className="label">Никнейм</div>
          <input
            className="input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Например: MishNef"
          />
          <div className="hint">3-32 символа, только a-z A-Z 0-9 _ -</div>
        </div>

        {msg && <div className="msg">{msg}</div>}

        <button className="btn btn-save" onClick={save} disabled={saving}>
          {saving ? "Сохранение..." : "Сохранить"}
        </button>
      </div>
    </div>
  );
}