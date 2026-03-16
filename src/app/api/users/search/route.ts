import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { ilike } from "drizzle-orm";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (!q) return NextResponse.json({ users: [] });

  const list = await db.query.users.findMany({
    where: ilike(users.username, `%${q}%`),
    columns: { id: true, username: true, avatarUrl: true, friendCode: true, isProfilePrivate: true },
    limit: 20,
  });

  return NextResponse.json({ users: list });
}