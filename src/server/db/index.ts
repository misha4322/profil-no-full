import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

const rootDir = process.cwd();
const envLocalPath = path.join(rootDir, ".env.local");
const envPath = path.join(rootDir, ".env");

// Сначала пробуем .env.local, потом .env
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
}

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath, override: false });
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL не найден. Добавь его в .env.local или .env для Elysia API."
  );
}

const queryClient = postgres(databaseUrl, {
  max: 10,
  ssl: process.env.NODE_ENV === "production" ? "require" : false,
});

export const db = drizzle(queryClient, { schema });