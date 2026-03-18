"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import SteamGamePicker from "@/app/auth/components/SteamGamePicker";

import styles from "./PostEditor.module.css";

type Category = {
  id: string;
  title: string;
};

type Tag = {
  id: string;
  name: string;
};

type SteamGame = {
  appid: number;
  name: string;
  headerImage: string;
  capsuleImage: string;
};

export default function PostEditor({
  userId,
  categories,
  tags,
}: {
  userId: string;
  categories: Category[];
  tags: Tag[];
}) {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverUrl, setCoverUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [error, setError] = useState("");
  const [steamGame, setSteamGame] = useState<SteamGame | null>(null);

  const canSubmit = useMemo(() => {
    return title.trim().length > 0 && content.trim().length > 0;
  }, [title, content]);

  function toggleTag(id: string) {
    setTagIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function uploadCover(file: File) {
    const fd = new FormData();
    fd.append("file", file);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: fd,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.error || "Ошибка загрузки обложки");
    }

    return String(data.urls?.[0] || data.url || "");
  }

  async function uploadImages(files: FileList | null) {
    if (!files || files.length === 0) return;

    setUploadingImages(true);
    setError("");

    try {
      const fd = new FormData();
      Array.from(files).forEach((file) => fd.append("files[]", file));

      const res = await fetch("/api/upload", {
        method: "POST",
        body: fd,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Ошибка загрузки изображений");
      }

      const urls = Array.isArray(data.urls) ? data.urls : [];

      if (urls.length > 0) {
        const markdownImages = urls
          .map((url: string) => `![Изображение](${url})`)
          .join("\n\n");

        setContent((prev) => (prev ? `${prev}\n\n${markdownImages}` : markdownImages));
      }
    } catch (err: any) {
      setError(err.message || "Ошибка загрузки изображений");
    } finally {
      setUploadingImages(false);
    }
  }

  async function submit() {
    if (!canSubmit) return;

    setError("");
    setIsLoading(true);

    try {
      let uploadedCover: string | null = null;

      if (coverFile) {
        uploadedCover = await uploadCover(coverFile);
        setCoverUrl(uploadedCover);
      }

      let finalContent = content.trim();

      if (steamGame) {
        finalContent = `**🎮 ${steamGame.name}**\n\n${finalContent}`;
      }

      const res = await fetch("/api/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          title: title.trim(),
          content: finalContent,
          categoryId: categoryId || null,
          tagIds,
          isPublished: true,
          coverImage: uploadedCover || steamGame?.headerImage || null,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Ошибка создания поста");
      }

      if (!data?.post?.slug) {
        throw new Error("Сервер не вернул slug нового поста");
      }

      router.push(`/posts/${data.post.slug}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Сетевая ошибка");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className={styles.editor}>
      {error ? <div className={styles.error}>{error}</div> : null}

      <div className={styles.grid}>
        <div className={styles.mainColumn}>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Основное</h2>

            <div className={styles.field}>
              <label className={styles.label}>Заголовок поста</label>
              <input
                className={styles.input}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Например: Лучшие настройки для CS2"
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Текст поста</label>
              <textarea
                className={styles.textarea}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Опиши тему, вопрос, мнение или гайд..."
              />
            </div>

            <div className={styles.uploadBlock}>
              <label className={styles.uploadButton}>
                <span>📷 Загрузить изображения в текст</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className={styles.hiddenInput}
                  onChange={(e) => void uploadImages(e.target.files)}
                  disabled={uploadingImages}
                />
              </label>

              {uploadingImages ? (
                <span className={styles.uploadHint}>Загрузка изображений...</span>
              ) : (
                <span className={styles.uploadHint}>
                  Они вставятся в текст в формате Markdown.
                </span>
              )}
            </div>
          </section>
        </div>

        <div className={styles.sideColumn}>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Категория и теги</h2>

            <div className={styles.field}>
              <label className={styles.label}>Игра / категория</label>
              <select
                className={styles.select}
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">— выбрать —</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.title}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Теги</label>
              <div className={styles.tags}>
                {tags.map((tag) => {
                  const active = tagIds.includes(tag.id);

                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className={`${styles.tagButton} ${active ? styles.tagButtonActive : ""}`}
                    >
                      #{tag.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Steam</h2>

            <SteamGamePicker
              selectedGame={steamGame}
              onSelect={(game) => {
                setSteamGame(game);

                if (game && !title.trim()) {
                  setTitle(game.name);
                }
              }}
            />
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Обложка</h2>

            <div className={styles.field}>
              <label className={styles.label}>Загрузить свою картинку</label>
              <input
                type="file"
                accept="image/*"
                className={styles.fileInput}
                onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
              />
            </div>

            {coverFile ? (
              <div className={styles.uploadHint}>
                Выбрано: <strong>{coverFile.name}</strong>
              </div>
            ) : null}

            {coverUrl || steamGame?.headerImage ? (
              <img
                src={coverUrl || steamGame?.headerImage}
                alt="Предпросмотр обложки"
                className={styles.preview}
              />
            ) : (
              <div className={styles.previewPlaceholder}>Обложка появится здесь</div>
            )}
          </section>

          <button
            type="button"
            disabled={isLoading || !canSubmit}
            onClick={() => void submit()}
            className={styles.submitButton}
          >
            {isLoading ? "Публикация..." : "Опубликовать пост"}
          </button>
        </div>
      </div>
    </div>
  );
}