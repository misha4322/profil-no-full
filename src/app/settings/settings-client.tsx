"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./SettingsClient.module.css";

async function readJsonSafe(res: Response) {
  const text = await res.text();

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Сервер вернул не JSON. Проверь маршрут: ${res.url}`);
  }
}

export default function SettingsClient({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/users/me/${userId}`, { cache: "no-store" });
        const json = await readJsonSafe(res);

        if (!res.ok) {
          throw new Error(json?.error || "Ошибка загрузки профиля");
        }

        setUsername(json.user.username ?? "");
        setAvatarUrl(json.user.avatarUrl ?? null);
      } catch (error: any) {
        setMessage(error?.message || "Ошибка загрузки");
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  async function uploadAvatar() {
    if (!selectedFile) return;

    try {
      setUploading(true);
      setMessage("");

      const form = new FormData();
      form.append("file", selectedFile);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: form,
      });

      const json = await readJsonSafe(res);

      if (!res.ok) {
        throw new Error(json?.error || "Ошибка загрузки файла");
      }

      const url = json?.urls?.[0] ?? null;
      if (!url) {
        throw new Error("Пустой ответ upload");
      }

      setAvatarUrl(url);
      setPreview(null);
      setSelectedFile(null);
      setMessage("Аватар загружен. Теперь нажми «Сохранить изменения».");
    } catch (error: any) {
      setMessage(error?.message || "Ошибка загрузки аватара");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    try {
      setSaving(true);
      setMessage("");

      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          username,
          avatarUrl,
        }),
      });

      const json = await readJsonSafe(res);

      if (!res.ok) {
        throw new Error(json?.error || "Ошибка сохранения");
      }

      setMessage("Изменения сохранены ✅");
    } catch (error: any) {
      setMessage(error?.message || "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.box}>Загрузка настроек...</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Настройки профиля</h1>
            <p className={styles.subtitle}>Рабочие настройки профиля через Elysia.</p>
          </div>

          <Link href="/profile" className={styles.backButton}>
            ← Назад в профиль
          </Link>
        </div>

        <div className={styles.grid}>
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Аватар</h2>

            <div className={styles.avatarRow}>
              {preview || avatarUrl ? (
                <img
                  src={preview || avatarUrl || ""}
                  alt="avatar"
                  className={styles.avatar}
                />
              ) : (
                <div className={styles.avatarPlaceholder}>
                  {(username?.[0] ?? "U").toUpperCase()}
                </div>
              )}

              <div className={styles.avatarActions}>
                <label className={styles.fileButton}>
                  Выбрать файл
                  <input
                    type="file"
                    accept="image/*"
                    className={styles.hiddenInput}
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      setSelectedFile(file);
                      setMessage("");

                      if (file) {
                        setPreview(URL.createObjectURL(file));
                      } else {
                        setPreview(null);
                      }
                    }}
                  />
                </label>

                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={uploadAvatar}
                  disabled={!selectedFile || uploading}
                >
                  {uploading ? "Загрузка..." : "Загрузить"}
                </button>

                <button
                  type="button"
                  className={styles.dangerButton}
                  onClick={() => {
                    setAvatarUrl(null);
                    setPreview(null);
                    setSelectedFile(null);
                    setMessage("Аватар удалён. Нажми «Сохранить изменения».");
                  }}
                >
                  Удалить
                </button>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Основное</h2>

            <div className={styles.field}>
              <label className={styles.label}>Никнейм</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={styles.input}
                placeholder="Например: MishNef"
              />
            </div>
          </div>
        </div>

        {message ? <div className={styles.message}>{message}</div> : null}

        <div className={styles.footer}>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={save}
            disabled={saving}
          >
            {saving ? "Сохранение..." : "Сохранить изменения"}
          </button>
        </div>
      </div>
    </div>
  );
}