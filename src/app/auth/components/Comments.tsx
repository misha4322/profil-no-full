"use client";

import { useEffect, useState, useCallback } from "react";

import CommentItem, { CommentNode } from "./CommentItem";
import "./Comments.css";

export default function Comments({
  postSlug,
  userId,
}: {
  postSlug: string;
  userId: string | null;
}) {
  const [comments, setComments] = useState<CommentNode[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const loadComments = useCallback(async () => {
    if (!postSlug) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const url = new URL(`/api/posts/${encodeURIComponent(postSlug)}/comments`, window.location.origin);

      if (userId) {
        url.searchParams.set("viewerId", userId);
      }

      const res = await fetch(url.toString(), {
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error(`Failed to load comments: ${res.status}`);
      }

      const data = await res.json();
      setComments(Array.isArray(data.comments) ? data.comments : []);
    } catch (err) {
      console.error("Failed to load comments:", err);
      setError("Не удалось загрузить комментарии");
    } finally {
      setLoading(false);
    }
  }, [postSlug, userId]);

  useEffect(() => {
    void loadComments();
  }, [loadComments]);

  async function addComment(parentId: string | null = null) {
    const content = text.trim();

    if (!userId) {
      setError("Сначала войди в аккаунт");
      return;
    }

    if (!content) {
      setError("Комментарий не может быть пустым");
      return;
    }
    if (!postSlug) {
      setError("Ошибка: slug поста не определён");
      return;
    }

    setSending(true);
    setError("");

    try {
      const res = await fetch(`/api/posts/${encodeURIComponent(postSlug)}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          content,
          parentId,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Не удалось отправить комментарий");
      }

      setText("");
      await loadComments();
    } catch (err: any) {
      setError(err.message || "Ошибка отправки комментария");
    } finally {
      setSending(false);
    }
  }

  const handleReaction = async (commentId: string, type: "like" | "dislike") => {
    if (!userId) {
      setError("Сначала войди в аккаунт");
      return;
    }

    try {
      const res = await fetch(`/api/comments/${commentId}/reaction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          type,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Не удалось поставить реакцию");
      }

      await loadComments();
    } catch (err: any) {
      setError(err.message || "Ошибка реакции");
    }
  };

  if (!postSlug) {
    return (
      <div className="comments-container">
        <h2 className="comments-title">Комментарии</h2>
        <div className="comments-error">Ошибка загрузки: slug поста не определён</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="comments-container">
        <h2 className="comments-title">Комментарии</h2>
        <div className="comments-loading">Загрузка комментариев...</div>
      </div>
    );
  }

  return (
    <div className="comments-container">
      <h2 className="comments-title">Комментарии</h2>

      <div className="comments-editor">
        <textarea
          className="comments-textarea"
          placeholder="Написать комментарий..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          disabled={sending}
        />

        {error ? <div className="comments-error">{error}</div> : null}

        <div className="comments-editor-actions">
          <button
            className="comments-submit-button"
            onClick={() => void addComment()}
            disabled={sending || !text.trim()}
          >
            {sending ? "Отправка..." : "Отправить"}
          </button>
        </div>
      </div>

      {comments.length === 0 ? (
        <div className="comments-empty">Пока нет комментариев. Будьте первым!</div>
      ) : (
        <div className="comments-list">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              postSlug={postSlug}
              userId={userId}
              onUpdate={loadComments}
              onReaction={handleReaction}
            />
          ))}
        </div>
      )}
    </div>
  );
}