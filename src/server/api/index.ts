import { Elysia } from "elysia";
<<<<<<< HEAD
import { node } from "@elysiajs/node";

=======
>>>>>>> e55ac280fb05062c9959b150f067539a31286f1d
import { postsRouter } from "./posts";
import { commentsRouter } from "./comments";
import { likesRouter } from "./likes";
import { forumRouter } from "./forum";
import { authRouter } from "./auth";
import { friendsRouter } from "./friends";
import { usersRouter } from "./users";
<<<<<<< HEAD
import { messagesRouter } from "./messages";

export const app = new Elysia({
  adapter: node(),
  prefix: "/api",
})
  .get("/health", () => ({
    ok: true,
    service: "elysia-api",
  }))
=======


export const app = new Elysia({ prefix: "/api" })
>>>>>>> e55ac280fb05062c9959b150f067539a31286f1d
  .use(authRouter)
  .use(postsRouter)
  .use(commentsRouter)
  .use(likesRouter)
  .use(forumRouter)
<<<<<<< HEAD
  .use(usersRouter)
  .use(friendsRouter)
  .use(messagesRouter);

export type App = typeof app;
=======
  .use(usersRouter)   
  .use(friendsRouter)

export type App = typeof app;
>>>>>>> e55ac280fb05062c9959b150f067539a31286f1d
