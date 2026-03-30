import { router } from "./trpc";
import { profileRouter } from "./routers/profile";

export const appRouter = router({
  profile: profileRouter,
});

export type AppRouter = typeof appRouter;
