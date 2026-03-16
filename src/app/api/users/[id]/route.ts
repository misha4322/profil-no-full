import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/server/db";
import { friendships, users } from "@/server/db/schema";
import { and, eq, or } from "drizzle-orm";
import { resolveUserUuid } from "@/lib/user-utils";

export const runtime = "nodejs";

async function friendStatus(viewerId: string | null, targetId: string) {
  if (!viewerId) return "none" as const;
  if (viewerId === targetId) return "self" as const;

  const direct = await db.query.friendships.findFirst({
    where: and(eq(friendships.requesterId, viewerId), eq(friendships.addresseeId, targetId)),
    columns: { status: true },
  });
  const reverse = await db.query.friendships.findFirst({
    where: and(eq(friendships.requesterId, targetId), eq(friendships.addresseeId, viewerId)),
    columns: { status: true },
  });

  if (direct?.status === "accepted" || reverse?.status === "accepted") return "friends" as const;
  if (direct?.status === "pending") return "outgoing" as const;
  if (reverse?.status === "pending") return "incoming" as const;
  return "none" as const;
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const targetId = params.id;

  const session = await getServerSession(authOptions);
  const viewerId = session?.user ? await resolveUserUuid(session) : null;

  const u = await db.query.users.findFirst({
    where: eq(users.id, targetId),
    columns: { id: true, username: true, avatarUrl: true, isProfilePrivate: true },
  });

  if (!u) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const st = await friendStatus(viewerId, targetId);
  const canView = !u.isProfilePrivate || st === "friends" || st === "self";

  return NextResponse.json({
    user: { id: u.id, username: u.username, avatarUrl: u.avatarUrl ?? null, isProfilePrivate: u.isProfilePrivate },
    friendStatus: st,
    canView,
  });
}