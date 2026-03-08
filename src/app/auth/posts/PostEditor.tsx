"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import SteamGamePicker from "@/app/auth/components/SteamGamePicker";

type Category = { id: string; title: string };
type Tag = { id: string; name: string };

export default function PostEditor({
  categories,
  tags,
}: {
  categories: Category[];
  tags: Tag[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverUrl, setCoverUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [error, setError] = useState<string>("");
  
  // Новое состояние для Steam игры
  const [steamGame, setSteamGame] = useState<{
    appid: number;
    name: string;
    headerImage: string;
    capsuleImage: string;
  } | null>(null);

  const canSubmit = useMemo(() => title.trim() && content.trim(), [title, content]);

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
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Upload failed");
    // data.urls — массив, берём первый
    return String(data.urls?.[0] || data.url);
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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      const urls = data.urls as string[];
      if (urls && urls.length > 0) {
        const markdownImages = urls
          .map((url) => `![Подпись](${url})`)
          .join("\n\n");
        setContent((prev) => (prev ? prev + "\n\n" + markdownImages : markdownImages));
      }
    } catch (err: any) {
      setError(err.message || "Ошибка загрузки изображений");
    } finally {
      setUploadingImages(false);
    }
  }

  async function submit() {
    setError("");
    if (!canSubmit) return;

    setIsLoading(true);
    try {
      let uploadedCover: string | null = null;
      if (coverFile) {
        uploadedCover = await uploadCover(coverFile);
        setCoverUrl(uploadedCover);
      }

      // Формируем контент с учетом выбранной игры
      let finalContent = content;
      if (steamGame) {
        finalContent = `**🎮 ${steamGame.name}**\n\n${content}`;
      }

      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content: finalContent,
          categoryId: categoryId || null,
          tagIds,
          isPublished: true,
          // Используем картинку Steam если нет загруженной обложки
          coverImage: uploadedCover || steamGame?.headerImage || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Ошибка создания поста");
        setIsLoading(false);
        return;
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
    <div className="space-y-5">
      {error && (
        <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/40">
          {error}
        </div>
      )}

      <div>
        <label className="text-sm text-gray-300">Заголовок</label>
        <input
          className="mt-2 w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 outline-none"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Например: Мой обзор на..."
        />
      </div>

      <div>
        <label className="text-sm text-gray-300">Игра (категория)</label>
        <select
          className="mt-2 w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 outline-none"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          <option value="">— выбрать —</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </div>

      {/* Новый компонент выбора игры из Steam */}
      <SteamGamePicker
        selectedGame={steamGame}
        onSelect={(game) => {
          setSteamGame(game);
          // Автоматически установим название игры как заголовок, если он пустой
          if (game && !title.trim()) {
            setTitle(game.name);
          }
        }}
      />

      <div>
        <label className="text-sm text-gray-300">Темы (теги)</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {tags.map((t) => {
            const active = tagIds.includes(t.id);
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => toggleTag(t.id)}
                className={[
                  "text-xs px-3 py-2 rounded-xl border transition",
                  active
                    ? "bg-violet-600 border-violet-500"
                    : "bg-white/5 border-white/10 hover:bg-white/10",
                ].join(" ")}
              >
                #{t.name}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="text-sm text-gray-300">Обложка (картинка)</label>
        <input
          type="file"
          accept="image/*"
          className="mt-2 block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-600 file:text-white hover:file:bg-violet-700"
          onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
        />
        {/* Показываем предпросмотр: загруженная обложка или картинка из Steam */}
        {(coverUrl || steamGame?.headerImage) && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverUrl || steamGame?.headerImage}
            alt="Предпросмотр обложки"
            className="mt-3 rounded-xl max-h-64 object-cover border border-white/10"
          />
        )}
      </div>

      <div>
        <label className="text-sm text-gray-300">Текст</label>
        <textarea
          className="mt-2 w-full min-h-[220px] rounded-xl bg-white/5 border border-white/10 px-4 py-3 outline-none"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Пиши пост... Можно вставить изображения через кнопку ниже"
        />

        {/* Кнопка загрузки нескольких изображений */}
        <div className="mt-3">
          <label className="relative cursor-pointer bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium py-2 px-4 rounded-full transition">
            <span>📷 Загрузить изображения</span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={(e) => uploadImages(e.target.files)}
              disabled={uploadingImages}
            />
          </label>
          {uploadingImages && (
            <span className="ml-3 text-gray-400 text-sm">Загрузка...</span>
          )}
          <p className="text-xs text-gray-500 mt-1">
            Изображения будут вставлены в текст поста в формате Markdown. Вы можете редактировать подписи.
          </p>
        </div>
      </div>

      <button
        disabled={isLoading || !canSubmit}
        onClick={submit}
        className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50"
      >
        {isLoading ? "Создаю..." : "Опубликовать"}
      </button>
    </div>
  );
}
