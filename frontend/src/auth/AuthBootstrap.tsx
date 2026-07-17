import { useEffect } from 'react';
import { useAuthStore } from '../store/auth.store';
import { refreshAccessToken } from '../api/client';

export function AuthBootstrap({ children }: { children: React.ReactNode }) {
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
