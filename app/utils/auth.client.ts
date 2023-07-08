import { trpc } from "../trpc/client";

export function useCurrentUser() {
  trpc.users_refreshSession;
}
