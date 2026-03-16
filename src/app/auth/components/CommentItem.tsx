"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import "./CommentItem.css";

export type CommentNode = {
  id: string;
  postId: string;
  parentId: string | null;
  content: string;
  createdAt: string | null;
  author: {
    id: string;
    username: string;
    avatarUrl: string | null;
  };
  likeCount: number;
  likedByMe: boolean;
  dislikeCount: number;
  dislikedByMe: boolean;
  replies: CommentNode[];
};

interface CommentItemProps {
  comment: CommentNode;
  postId: string;
  onUpdate: () => void;
  onReaction: (commentId: string, type: "like" | "dislike") => Promise<void>;
}

export default function CommentItem({ comment, postId, onUpdate, onReaction }: CommentItemProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const timeAgo = comment.createdAt
    ? formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: ru })
    : "недавно";

  async function submitReply() {
    const content = replyText.trim();
    if (!content) return;

    if (!postId || postId === "undefined") {
      setError("Ошибка: ID поста не найден");
      return;
    }

    setSending(true);
    setError("");

    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, parentId: comment.id }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Ошибка отправки");

      setReplyText("");
      setIsReplying(false);
      onUpdate();
    } catch (err: any) {
      setError(err.message || "Ошибка сети");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="comment-item">
      <div className="comment-header">
        {/* ✅ ССЫЛКА НА ПРОФИЛЬ АВТОРА */}
        <Link href={`/u/${comment.author.id}`} className="comment-author">
          {comment.author.avatarUrl ? (
            <Image
              src={comment.author.avatarUrl}
              alt={comment.author.username}
              width={40}
              height={40}
              className="comment-avatar"
            />
          ) : (
            <div className="comment-avatar-placeholder">
              {comment.author.username[0]?.toUpperCase() ?? "U"}
            </div>
          )}

          <div className="comment-author-info">
            <span className="comment-username">{comment.author.username}</span>
            <span className="comment-date">{timeAgo}</span>
          </div>
        </Link>
      </div>

      <div className="comment-content">{comment.content}</div>

      <div className="comment-actions">
        <button
          type="button"
          className={`comment-action-button ${comment.likedByMe ? "liked" : ""}`}
          onClick={() => onReaction(comment.id, "like")}
        >
          <span className="comment-action-icon">👍</span>
          {comment.likeCount > 0 && <span className="comment-action-count">{comment.likeCount}</span>}
        </button>

        <button
          type="button"
          className={`comment-action-button ${comment.dislikedByMe ? "disliked" : ""}`}
          onClick={() => onReaction(comment.id, "dislike")}
        >
          <span className="comment-action-icon">👎</span>
          {comment.dislikeCount > 0 && (
            <span className="comment-action-count">{comment.dislikeCount}</span>
          )}
        </button>

        <button
          type="button"
          className="comment-reply-button"
          onClick={() => setIsReplying((v) => !v)}
        >
          Ответить
        </button>
      </div>

      {isReplying && (
        <div className="comment-reply-form">
          <textarea
            className="comment-reply-textarea"
            placeholder="Напишите ответ..."
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            rows={2}
            autoFocus
            disabled={sending}
          />

          {error && <div style={{ color: "red", fontSize: "12px", marginBottom: "8px" }}>{error}</div>}

          <div className="comment-reply-actions">
            <button
              className="comment-reply-submit"
              onClick={submitReply}
              disabled={sending || !replyText.trim()}
            >
              {sending ? "Отправка..." : "Отправить"}
            </button>

            <button
              className="comment-reply-cancel"
              onClick={() => {
                setIsReplying(false);
                setReplyText("");
                setError("");
              }}
              disabled={sending}
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {comment.replies?.length > 0 && (
        <div className="comment-replies">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              postId={postId}
              onUpdate={onUpdate}
              onReaction={onReaction}
            />
          ))}
        </div>
      )}
    </div>
  );
}