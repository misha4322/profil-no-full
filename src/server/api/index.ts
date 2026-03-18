import { Elysia } from "elysia";
import { node } from "@elysiajs/node";

import { postsRouter } from "./posts";
import { commentsRouter } from "./comments";
import { likesRouter } from "./likes";
import { forumRouter } from "./forum";
import { authRouter } from "./auth";
import { friendsRouter } from "./friends";
import { usersRouter } from "./users";
import { messagesRouter } from "./messages";

const allowedOrigins = new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

function applyCors(request: Request, set: any) {
  const origin = request.headers.get("origin");

  if (!origin || !allowedOrigins.has(origin)) {
    return;
  }

  set.headers["Access-Control-Allow-Origin"] = origin;
  set.headers["Access-Control-Allow-Methods"] =
    "GET, POST, PUT, PATCH, DELETE, OPTIONS";
  set.headers["Access-Control-Allow-Headers"] =
    "Content-Type, Authorization";
  set.headers["Access-Control-Allow-Credentials"] = "true";
  set.headers["Vary"] = "Origin";
}

export const app = new Elysia({
  adapter: node(),
  prefix: "/api",
})
  .onRequest(({ request, set }) => {
    applyCors(request, set);
  })
  .onAfterHandle(({ request, set }) => {
    applyCors(request, set);
  })
  .options("/*", ({ request, set }) => {
    applyCors(request, set);
    set.status = 204;
    return "";
  })
  .get("/health", () => ({
    ok: true,
    service: "elysia-api",
  }))
  .use(authRouter)
  .use(postsRouter)
  .use(commentsRouter)
  .use(likesRouter)
  .use(forumRouter)
  .use(usersRouter)
  .use(friendsRouter)
  .use(messagesRouter);

export type App = typeof app;