import { Elysia } from "elysia";
import { node } from "@elysiajs/node";

import { postsRouter } from "./posts";
import { commentsRouter } from "./comments";
import { likesRouter } from "./likes";
import { forumRouter } from "./forum";
import { authRouter } from "./auth";
import { friendsRouter } from "./friends";
import { usersRouter } from "./users";

export const app = new Elysia({
  adapter: node(),
  prefix: "/api",
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
  .use(friendsRouter);

export type App = typeof app;