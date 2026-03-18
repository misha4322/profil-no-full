"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "@/lib/api";
import styles from "./SettingsClient.module.css";

type SettingsUser = {
  id: string;
  username: string;
  email: string | null;
  avatarUrl: string | null;
  profileBannerUrl: string | null;
  statusText: string | null;
  bio: string | null;
  location: string | null;
  websiteUrl: string | null;
  telegram: string | null;
  discord: string | null;
  steamProfileUrl: string | null;
  favoriteGames: string | null;
  showEmail: boolean;
  isProfilePrivate: boolean;
  createdAt: string | null;
};

type SettingsResponse = {
  user: SettingsUser;
};

export default function SettingsClient({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState<string | null>(null);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [profileBannerUrl, setProfileBannerUrl] = useState<string | null>(null);

  const [statusText, setStatusText] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [telegram, setTelegram] = useState("");
  const [discord, setDiscord] = useState("");
  const [steamProfileUrl, setSteamProfileUrl] = useState("");
  const [favoriteGames, setFavoriteGames] = useState("");

  const [showEmail, setShowEmail] = useState(false);
  const [isProfilePrivate, setIsProfilePrivate] = useState(false);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  const [message, setMessage] = useState("");

  const avatarSrc = useMemo(() => avatarPreview ?? avatarUrl, [avatarPreview, avatarUrl]);
  const bannerSrc = useMemo(
    () => bannerPreview ?? profileBannerUrl,
    [bannerPreview, profileBannerUrl]
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setMessage("");

        const data = await apiRequest<SettingsResponse>(`/users/me/${userId}`, {
          method: "GET",
        });

        if (cancelled) return;

        const user = data.user;

        setUsername(user.username ?? "");
        setEmail(user.email ?? null);
        setAvatarUrl(user.avatarUrl ?? null);
        setProfileBannerUrl(user.profileBannerUrl ?? null);
        setStatusText(user.statusText ?? "");
        setBio(user.bio ?? "");
        setLocation(user.location ?? "");
        setWebsiteUrl(user.websiteUrl ?? "");
        setTelegram(user.telegram ?? "");
        setDiscord(user.discord ?? "");
        setSteamProfileUrl(user.steamProfileUrl ?? "");
        setFavoriteGames(user.favoriteGames ?? "");
        setShowEmail(!!user.showEmail);
        setIsProfilePrivate(!!user.isProfilePrivate);
      } catch (error) {
        if (cancelled) return;
        setMessage(error instanceof Error ? error.message : "Ошибка загрузки настроек");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  async function uploadSingle(
    file: File,
    setUploading: (value: boolean) => void
  ) {
    setUploading(true);

    try {
      const form = new FormData();
      form.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: form,
      });

      const text = await res.text();
      let json: any = {};

      if (text) {
        try {
          json = JSON.parse(text);
        } catch {
          throw new Error("Сервер загрузки вернул не JSON");
        }
      }

      if (!res.ok) {
        throw new Error(
          typeof json?.error === "string" ? json.error : "Ошибка загрузки файла"
        );
      }

      const url = Array.isArray(json?.urls) ? json.urls[0] : null;
      if (!url || typeof url !== "string") {
        throw new Error("Upload вернул пустой url");
      }

      return url;
    } finally {
      setUploading(false);
    }
  }

  async function uploadAvatar() {
    if (!avatarFile) return;

    try {
      setMessage("");
      const url = await uploadSingle(avatarFile, setUploadingAvatar);
      setAvatarUrl(url);
      setAvatarPreview(null);
      setAvatarFile(null);
      setMessage("Аватар загружен. Нажми «Сохранить изменения».");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ошибка загрузки аватара");
    }
  }

  async function uploadBanner() {
    if (!bannerFile) return;

    try {
      setMessage("");
      const url = await uploadSingle(bannerFile, setUploadingBanner);
      setProfileBannerUrl(url);
      setBannerPreview(null);
      setBannerFile(null);
      setMessage("Баннер загружен. Нажми «Сохранить изменения».");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ошибка загрузки баннера");
    }
  }

  async function save() {
    try {
      setSaving(true);
      setMessage("");

      await apiRequest(`/users/me`, {
        method: "PATCH",
        body: JSON.stringify({
          userId,
          username,
          avatarUrl,
          profileBannerUrl,
          statusText: statusText || null,
          bio: bio || null,
          location: location || null,
          websiteUrl: websiteUrl || null,
          telegram: telegram || null,
          discord: discord || null,
          steamProfileUrl: steamProfileUrl || null,
          favoriteGames: favoriteGames || null,
          showEmail,
          isProfilePrivate,
        }),
      });

      setMessage("Профиль сохранён ✅");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ошибка сохранения");
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
            <p className={styles.subtitle}>
              Здесь редактируются данные профиля, изображения и приватность.
            </p>
          </div>

          <Link href="/profile" className={styles.backButton}>
            ← Назад в профиль
          </Link>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Баннер профиля</h2>

          {bannerSrc ? (
            <img src={bannerSrc} alt="banner" className={styles.bannerPreview} />
          ) : (
            <div className={styles.bannerPlaceholder}>Баннер не загружен</div>
          )}

          <div className={styles.uploadRow}>
            <label className={styles.fileButton}>
              Выбрать баннер
              <input
                type="file"
                accept="image/*"
                className={styles.hiddenInput}
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  setBannerFile(file);

                  if (file) {
                    setBannerPreview(URL.createObjectURL(file));
                  } else {
                    setBannerPreview(null);
                  }
                }}
              />
            </label>

            <button
              type="button"
              className={styles.secondaryButton}
              disabled={!bannerFile || uploadingBanner}
              onClick={() => void uploadBanner()}
            >
              {uploadingBanner ? "Загрузка..." : "Загрузить баннер"}
            </button>

            <button
              type="button"
              className={styles.dangerButton}
              onClick={() => {
                setProfileBannerUrl(null);
                setBannerPreview(null);
                setBannerFile(null);
                setMessage("Баннер удалён. Нажми «Сохранить изменения».");
              }}
            >
              Удалить баннер
            </button>
          </div>
        </div>

        <div className={styles.grid}>
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Аватар</h2>

            <div className={styles.avatarRow}>
              {avatarSrc ? (
                <img src={avatarSrc} alt="avatar" className={styles.avatar} />
              ) : (
                <div className={styles.avatarPlaceholder}>
                  {(username?.[0] ?? "U").toUpperCase()}
                </div>
              )}

              <div className={styles.avatarActions}>
                <label className={styles.fileButton}>
                  Выбрать фото
                  <input
                    type="file"
                    accept="image/*"
                    className={styles.hiddenInput}
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      setAvatarFile(file);

                      if (file) {
                        setAvatarPreview(URL.createObjectURL(file));
                      } else {
                        setAvatarPreview(null);
                      }
                    }}
                  />
                </label>

                <button
                  type="button"
                  className={styles.secondaryButton}
                  disabled={!avatarFile || uploadingAvatar}
                  onClick={() => void uploadAvatar()}
                >
                  {uploadingAvatar ? "Загрузка..." : "Загрузить"}
                </button>

                <button
                  type="button"
                  className={styles.dangerButton}
                  onClick={() => {
                    setAvatarUrl(null);
                    setAvatarPreview(null);
                    setAvatarFile(null);
                    setMessage("Аватар удалён. Нажми «Сохранить изменения».");
                  }}
                >
                  Удалить
                </button>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Приватность</h2>

            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={isProfilePrivate}
                onChange={(e) => setIsProfilePrivate(e.target.checked)}
              />
              <span>Сделать профиль приватным</span>
            </label>

            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={showEmail}
                onChange={(e) => setShowEmail(e.target.checked)}
              />
              <span>Показывать email в профиле</span>
            </label>

            <div className={styles.field}>
              <label className={styles.label}>Email аккаунта</label>
              <input
                value={email ?? ""}
                readOnly
                className={styles.input}
                placeholder="Email"
              />
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Основная информация</h2>

          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label className={styles.label}>Никнейм</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={styles.input}
                placeholder="Ник"
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Статус</label>
              <input
                value={statusText}
                onChange={(e) => setStatusText(e.target.value)}
                className={styles.input}
                placeholder="Например: Ищу пати в CS2"
                maxLength={120}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Локация</label>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className={styles.input}
                placeholder="Например: Berlin"
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Сайт</label>
              <input
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                className={styles.input}
                placeholder="https://..."
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Telegram</label>
              <input
                value={telegram}
                onChange={(e) => setTelegram(e.target.value)}
                className={styles.input}
                placeholder="@username"
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Discord</label>
              <input
                value={discord}
                onChange={(e) => setDiscord(e.target.value)}
                className={styles.input}
                placeholder="nickname#0000"
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Steam Profile URL</label>
              <input
                value={steamProfileUrl}
                onChange={(e) => setSteamProfileUrl(e.target.value)}
                className={styles.input}
                placeholder="https://steamcommunity.com/..."
              />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>О себе</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className={styles.textarea}
              placeholder="Напиши несколько слов о себе"
              rows={5}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Любимые игры</label>
            <textarea
              value={favoriteGames}
              onChange={(e) => setFavoriteGames(e.target.value)}
              className={styles.textarea}
              placeholder="Например: CS2, Dota 2, The Witcher 3, Elden Ring"
              rows={4}
            />
          </div>
        </div>

        {message ? <div className={styles.message}>{message}</div> : null}

        <div className={styles.footer}>
          <button
            type="button"
            className={styles.primaryButton}
            disabled={saving}
            onClick={() => void save()}
          >
            {saving ? "Сохранение..." : "Сохранить изменения"}
          </button>
        </div>
      </div>
    </div>
  );
}