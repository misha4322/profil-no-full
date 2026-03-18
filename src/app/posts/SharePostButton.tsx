"use client";

import Link from "next/link";

export default function SharePostButton({
  postId,
  title,
}: {
  postId: string;
  title: string;
}) {
  const params = new URLSearchParams({
    sharePostId: postId,
    shareTitle: title,
  });

  return (
    <Link href={`/messages?${params.toString()}`} className="post-share-button">
      💬 Отправить другу
    </Link>
  );
}