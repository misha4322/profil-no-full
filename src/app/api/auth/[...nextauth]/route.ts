import NextAuth, { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import YandexProvider from "next-auth/providers/yandex";
import CredentialsProvider from "next-auth/providers/credentials";
import Steam from "next-auth-steam";
import bcrypt from "bcrypt";
import type { NextRequest } from "next/server";
import { and, eq, or } from "drizzle-orm";

import { db } from "@/server/db";
import { users } from "@/server/db/schema";

export const runtime = "nodejs";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function makeUniqueUsername(rawName: string) {
  const base = rawName.trim().slice(0, 32) || "user";

  let username = base;
  let i = 0;

  while (true) {
    const existing = await db.query.users.findFirst({
      where: eq(users.username, username),
      columns: { id: true },
    });

    if (!existing) {
      return username;
    }

    i += 1;
    const suffix = `_${i}`;
    username = `${base.slice(0, Math.max(1, 32 - suffix.length))}${suffix}`;
  }
}

async function findUserForOAuth(params: {
  email: string | null;
  provider: string;
  providerId: string;
}) {
  const { email, provider, providerId } = params;

  if (email) {
    const byEmail = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (byEmail) {
      return byEmail;
    }
  }

  const byProvider = await db.query.users.findFirst({
    where: and(eq(users.provider, provider), eq(users.providerId, providerId)),
  });

  return byProvider ?? null;
}

function buildBaseProviders() {
  const providers: NextAuthOptions["providers"] = [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email ? normalizeEmail(credentials.email) : "";
        const password = credentials?.password ?? "";

        if (!email || !password) {
          return null;
        }

        const user = await db.query.users.findFirst({
          where: eq(users.email, email),
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.username,
          image: user.avatarUrl ?? undefined,
        };
      },
    }),
  ];

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    providers.push(
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      })
    );
  }

  if (process.env.YANDEX_CLIENT_ID && process.env.YANDEX_CLIENT_SECRET) {
    providers.push(
      YandexProvider({
        clientId: process.env.YANDEX_CLIENT_ID,
        clientSecret: process.env.YANDEX_CLIENT_SECRET,
      })
    );
  }

  return providers;
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },

  pages: {
    signIn: "/auth/login",
    signOut: "/",
    error: "/auth/error",
    newUser: "/auth/register",
  },

  providers: buildBaseProviders(),

  callbacks: {
    async signIn({ user, account, profile }) {
      if (!account?.provider) {
        return false;
      }

      if (account.provider === "credentials") {
        return true;
      }

      const provider = account.provider;
      const providerId = account.providerAccountId;
      const email =
        provider !== "steam" && user.email ? normalizeEmail(user.email) : null;

      if (provider !== "steam" && !email) {
        return false;
      }

      const existing = await findUserForOAuth({
        email,
        provider,
        providerId,
      });

      if (!existing) {
        const rawName =
          user.name ??
          (profile as any)?.personaname ??
          `user_${provider}_${providerId.slice(0, 8)}`;

        const username = await makeUniqueUsername(rawName);

        await db.insert(users).values({
          email,
          username,
          provider,
          providerId,
          avatarUrl: user.image ?? (profile as any)?.avatarfull ?? null,
        });
      }

      return true;
    },

    async jwt({ token, user, account }) {
      if (account?.provider) {
        if (account.provider === "credentials" && user?.id) {
          token.userId = user.id;
          token.email = user.email ?? null;
          token.name = user.name ?? null;
          token.picture = user.image ?? null;
          return token;
        }

        const provider = account.provider;
        const providerId = account.providerAccountId;
        const email = user?.email ? normalizeEmail(user.email) : null;

        const dbUser = await findUserForOAuth({
          email,
          provider,
          providerId,
        });

        if (dbUser) {
          token.userId = dbUser.id;
          token.email = dbUser.email ?? token.email ?? null;
          token.name = dbUser.username ?? token.name ?? null;
          token.picture = dbUser.avatarUrl ?? token.picture ?? null;
        }

        return token;
      }

      return token;
    },

    async session({ session, token }) {
      const userId = typeof token.userId === "string" ? token.userId : null;

      if (!session.user || !userId) {
        return session;
      }

      const dbUser = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: {
          id: true,
          email: true,
          username: true,
          avatarUrl: true,
        },
      });

      session.user.id = userId;
      session.user.email = dbUser?.email ?? (token.email as string | null) ?? null;
      session.user.name = dbUser?.username ?? (token.name as string | null) ?? null;
      session.user.image =
        dbUser?.avatarUrl ?? (token.picture as string | null) ?? null;

      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};

function buildOptions(req: NextRequest): NextAuthOptions {
  const options: NextAuthOptions = {
    ...authOptions,
    providers: [...(authOptions.providers ?? [])],
  };

  const steamSecret = process.env.STEAM_SECRET;
  if (steamSecret && steamSecret.trim()) {
    options.providers?.push(Steam(req, { clientSecret: steamSecret }));
  }

  return options;
}

async function handler(
  req: NextRequest,
  ctx: { params: { nextauth: string[] } }
) {
  return NextAuth(req, ctx, buildOptions(req));
}

export { handler as GET, handler as POST };