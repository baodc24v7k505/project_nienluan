import { useEffect } from "react";
import { useAuthStore } from "../store/auth.store";
import { refreshAccessToken } from "../api/client";
import { useQueryClient } from "@tanstack/react-query";

export function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  useEffect(
    () =>
      useAuthStore.subscribe((next, previous) => {
        if (next.user?.id !== previous.user?.id) {
          void queryClient.cancelQueries();
          queryClient.clear();
        }
      }),
    [queryClient],
  );
  const isReady = useAuthStore((s) => s.isReady);
  const setReady = useAuthStore((s) => s.setReady);

  useEffect(() => {
    refreshAccessToken().finally(() => setReady());
  }, [setReady]);

  if (!isReady) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-500">
        Đang tải...
      </div>
    );
  }

  return <>{children}</>;
}
