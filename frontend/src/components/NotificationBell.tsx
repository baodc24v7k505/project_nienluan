import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../api/notifications';

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: listNotifications,
    refetchInterval: 60_000,
  });

  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  function handleClickNotification(id: string, link: string | null) {
    markReadMutation.mutate(id);
    setOpen(false);
    if (link) navigate(link);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative text-xl text-white md:text-2xl"
        aria-label="Thông báo"
      >
        <i className="far fa-bell" />
        {!!data?.unreadCount && (
          <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-semibold text-brand">
            {data.unreadCount > 9 ? '9+' : data.unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-80 rounded-md border border-slate-200 bg-white text-slate-900 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
              <span className="text-sm font-semibold">Thông báo</span>
              {!!data?.unreadCount && (
                <button
                  onClick={() => markAllMutation.mutate()}
                  className="text-xs text-brand hover:underline"
                >
                  Đánh dấu đã đọc hết
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {data?.items.length === 0 && (
                <p className="p-4 text-center text-sm text-slate-400">Chưa có thông báo nào</p>
              )}
              {data?.items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClickNotification(n.id, n.link)}
                  className={`block w-full border-b border-slate-50 px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                    n.isRead ? 'text-slate-500' : 'bg-brand-bg font-medium text-slate-900'
                  }`}
                >
                  <p>{n.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{n.body}</p>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
