import Link from "next/link";
import { headers } from "next/headers";
import Comments from "@/app/auth/components/Comments";
import PostReactions from "@/app/auth/components/PostReactions";
<<<<<<< HEAD
import SharePostButton from "@/app/posts/SharePostButton";
=======

type Post = {
  id: string;
  slug: string;
  title: string;
  content: string;
  createdAt: string | null;
  coverImage: string | null;
  author: { id: string; username: string; avatarUrl: string | null };
  category: { id: string; title: string } | null;
  tags: { id: string; name: string }[];
  likeCount: number;
  dislikeCount: number;
  likedByMe: boolean;
  dislikedByMe: boolean;
};
>>>>>>> e55ac280fb05062c9959b150f067539a31286f1d

async function getBaseUrl() {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ??
    (process.env.NODE_ENV === "development" ? "http" : "https");
<<<<<<< HEAD

  return `${proto}://${host}`;
}

async function getPost(slug: string) {
=======
  return `${proto}://${host}`;
}

async function getPost(slug: string): Promise<Post> {
>>>>>>> e55ac280fb05062c9959b150f067539a31286f1d
  const base = await getBaseUrl();
  const res = await fetch(`${base}/api/posts/${encodeURIComponent(slug)}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to load post");
  }

  const data = await res.json();
<<<<<<< HEAD
  return data.post;
=======
  return data.post as Post;
>>>>>>> e55ac280fb05062c9959b150f067539a31286f1d
}

export default async function PostPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const post = await getPost(slug);

  return (
    <div className="post-page">
      <div className="container">
        <div className="post-navigation">
          <Link href="/posts" className="post-nav-link">
            ← К постам
          </Link>
          <Link href="/" className="post-nav-link">
            Главная
          </Link>
        </div>

        <h1 className="post-title">{post.title}</h1>

        <div className="post-meta">
          Автор: {post.author.username}
          {post.category ? ` • Игра: ${post.category.title}` : ""}
        </div>

        {post.tags?.length ? (
          <div className="post-tags">
<<<<<<< HEAD
            {post.tags.map((tag: any) => (
              <span key={tag.id} className="post-tag">
                #{tag.name}
=======
            {post.tags.map((t) => (
              <span key={t.id} className="post-tag">
                #{t.name}
>>>>>>> e55ac280fb05062c9959b150f067539a31286f1d
              </span>
            ))}
          </div>
        ) : null}

        {post.coverImage && (
<<<<<<< HEAD
=======
          // eslint-disable-next-line @next/next/no-img-element
>>>>>>> e55ac280fb05062c9959b150f067539a31286f1d
          <img
            src={post.coverImage}
            alt="Обложка поста"
            className="mt-4 rounded-2xl w-full max-h-[420px] object-cover border border-white/10"
          />
        )}

        <div className="post-content">{post.content}</div>

<<<<<<< HEAD
        <div className="flex items-center gap-3 mt-6 flex-wrap">
          <PostReactions
            slug={slug}
            likeCount={post.likeCount}
            dislikeCount={post.dislikeCount}
            likedByMe={post.likedByMe}
            dislikedByMe={post.dislikedByMe}
          />

          <SharePostButton postId={post.id} title={post.title} />
        </div>
=======
        <PostReactions
          slug={slug}
          likeCount={post.likeCount}
          dislikeCount={post.dislikeCount}
          likedByMe={post.likedByMe}
          dislikedByMe={post.dislikedByMe}
        />
>>>>>>> e55ac280fb05062c9959b150f067539a31286f1d

        <Comments postSlug={slug} />
      </div>
    </div>
  );
}