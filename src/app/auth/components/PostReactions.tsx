"use client";

import { useState } from "react";

export default function PostReactions(props: {
  slug: string;
  likeCount: number;
  dislikeCount: number;
  likedByMe: boolean;
  dislikedByMe: boolean;
}) {
  const [likeCount, setLikeCount] = useState(props.likeCount);
  const [dislikeCount, setDislikeCount] = useState(props.dislikeCount);
  const [likedByMe, setLikedByMe] = useState(props.likedByMe);
  const [dislikedByMe, setDislikedByMe] = useState(props.dislikedByMe);
  const [loading, setLoading] = useState(false);

  async function react(type: "like" | "dislike") {
    if (loading) return;

    setLoading(true);

    try {
      const res = await fetch(`/api/posts/${encodeURIComponent(props.slug)}/reaction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) return;

      setLikeCount(Number(data.likeCount) || 0);
      setDislikeCount(Number(data.dislikeCount) || 0);
      setLikedByMe(!!data.likedByMe);
      setDislikedByMe(!!data.dislikedByMe);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="post-reactions">
      <button
        type="button"
        disabled={loading}
        onClick={() => react("like")}
        className={`post-reaction-button ${likedByMe ? "active" : ""}`}
      >
        <span>👍</span>
        <span>{likeCount}</span>
      </button>

      <button
        type="button"
        disabled={loading}
        onClick={() => react("dislike")}
        className={`post-reaction-button negative ${dislikedByMe ? "active" : ""}`}
      >
        <span>👎</span>
        <span>{dislikeCount}</span>
      </button>
    </div>
  );
}