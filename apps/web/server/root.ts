import { router } from "./trpc";
import { profileRouter } from "./routers/profile";
import { tokenRouter } from "./routers/token";
import { userRouter } from "./routers/user";

export const appRouter = router({
  profile: profileRouter,
  token: tokenRouter,
  user: userRouter,
});

export type AppRouter = typeof appRouter;
