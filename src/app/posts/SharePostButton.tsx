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
    <Link
      href={`/messages?${params.toString()}`}
      className="px-3 py-2 rounded-xl border text-sm bg-white/5 border-white/10 hover:bg-white/10"
    >
      💬 Отправить другу
    </Link>
  );
}