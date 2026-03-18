// app/api/users/me/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { resolveUserUuid } from "@/lib/user-utils";

export const runtime = "nodejs";

// Разрешаем буквы любых языков + цифры + пробел + _ - .
function isValidUsername(s: string) {
  // 3..32 символа
  if (s.length < 3 || s.length > 32) return false;
  // Unicode letters/digits + space + _ - .
  return /^[\p{L}\p{N} _.-]+$/u.test(s);
}

function normalizeUsername(s: string) {
  // сжимаем пробелы и режем до 32
  return s.trim().replace(/\s+/g, " ").slice(0, 32);
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = await resolveUserUuid(session);
  if (!userId) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const u = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { id: true, username: true, avatarUrl: true },
  });

  if (!u) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({
    user: {
      id: u.id,
      username: u.username,
      avatarUrl: u.avatarUrl ?? null,
    },
  });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = await resolveUserUuid(session);
  if (!userId) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));

  const rawUsername = typeof body.username === "string" ? body.username : undefined;
  const rawAvatar =
    body.avatarUrl === null || typeof body.avatarUrl === "string" ? body.avatarUrl : undefined;

  const patch: Record<string, any> = {};

  if (rawUsername !== undefined) {
    const username = normalizeUsername(rawUsername);

    if (!isValidUsername(username)) {
      return NextResponse.json(
        { error: "Ник: 3–32 символа. Можно: буквы (в т.ч. кириллица), цифры, пробел, _ - ." },
        { status: 400 }
      );
    }

    // проверка уникальности
    const existing = await db.query.users.findFirst({
      where: eq(users.username, username),
      columns: { id: true },
    });

    if (existing && existing.id !== userId) {
      return NextResponse.json({ error: "Этот ник уже занят" }, { status: 409 });
    }

    patch.username = username;
  }

  if (rawAvatar !== undefined) {
    // если хочешь разрешить только локальные загрузки — раскомментируй:
    // if (typeof rawAvatar === "string" && rawAvatar && !rawAvatar.startsWith("/uploads/")) {
    //   return NextResponse.json({ error: "avatarUrl должен быть из /uploads/..." }, { status: 400 });
    // }
    patch.avatarUrl = rawAvatar; // string | null
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const updated = await db
    .update(users)
    .set(patch)
    .where(eq(users.id, userId))
    .returning({ id: users.id, username: users.username, avatarUrl: users.avatarUrl });

  return NextResponse.json({ success: true, user: updated[0] });
}