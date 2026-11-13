import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  getMessages,
  getOrCreateConversation,
  listMyConversations,
  sendMessage,
} from "../../api/chat";
import { getSocket } from "../../realtime/socket";
import { useAuthStore } from "../../store/auth.store";
import type { Message } from "../../types/chat";

function conversationLabel(
  conv: {
    type: string;
    customer: { fullName: string };
    shop: { name: string } | null;
  },
  currentRole: string,
): string {
  if (conv.type === "SUPPORT") {
    return currentRole === "CUSTOMER"
      ? "Hỗ trợ từ Sàn TMĐT"
      : `Hỗ trợ: ${conv.customer.fullName}`;
  }
  if (currentRole === "SELLER") return conv.customer.fullName;
  return conv.shop?.name ?? "Shop";
}

export function ChatPage() {
  const [searchParams] = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(
    searchParams.get("conversationId"),
  );
  const [draft, setDraft] = useState("");

  const { data: conversations } = useQuery({
    queryKey: ["conversations"],
    queryFn: listMyConversations,
    refetchInterval: 15_000,
  });

  const messageQuery = useInfiniteQuery({
    queryKey: ["messages", selectedId],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => getMessages(selectedId!, pageParam),
    getNextPageParam: (last, pages) =>
      last.length === 30 ? pages.length + 1 : undefined,
    enabled: !!selectedId,
  });
  const messages = messageQuery.data?.pages.slice().reverse().flat();

  useEffect(() => {
    if (!selectedId) return;
    const socket = getSocket();
    if (!socket) return;

    const rejoin = () => {
      socket.emit("conversation:join", { conversationId: selectedId });
      queryClient.invalidateQueries({ queryKey: ["messages", selectedId] });
    };
    rejoin();
    socket.on("connect", rejoin);

    const handleNewMessage = (msg: Message) => {
      if (msg.conversationId !== selectedId) return;
      queryClient.invalidateQueries({ queryKey: ["messages", selectedId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    };

    socket.on("message:new", handleNewMessage);

    return () => {
      socket.emit("conversation:leave", { conversationId: selectedId });
      socket.off("message:new", handleNewMessage);
      socket.off("connect", rejoin);
    };
  }, [selectedId, queryClient, token]);

  const sendMutation = useMutation({
    mutationFn: (body: string) => sendMessage(selectedId!, body),
    onSuccess: () => {
      setDraft("");
      queryClient.invalidateQueries({ queryKey: ["messages", selectedId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  const startSupportMutation = useMutation({
    mutationFn: () => getOrCreateConversation("SUPPORT"),
    onSuccess: (conv) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      setSelectedId(conv.id);
    },
  });

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim() || !selectedId) return;
    sendMutation.mutate(draft.trim());
  }

  if (!user) return null;

  return (
    <div className="grid h-[70vh] grid-cols-1 gap-4 md:grid-cols-[280px_1fr]">
      <div className="overflow-y-auto surface">
        {user.role === "CUSTOMER" && (
          <button
            onClick={() => startSupportMutation.mutate()}
            disabled={startSupportMutation.isPending}
            className="block w-full border-b border-slate-100 px-3 py-2 text-left text-sm text-brand hover:bg-brand-bg"
          >
            + Chat với hỗ trợ
          </button>
        )}
        {conversations?.length === 0 && (
          <p className="p-4 text-center text-sm text-slate-400">
            Chưa có cuộc trò chuyện nào
          </p>
        )}
        {conversations?.map((conv) => (
          <button
            key={conv.id}
            onClick={() => setSelectedId(conv.id)}
            className={`block w-full border-b border-slate-100 px-3 py-3 text-left text-sm hover:bg-slate-50 ${
              selectedId === conv.id ? "bg-brand-bg" : ""
            }`}
          >
            <p className="font-medium text-slate-900">
              {conversationLabel(conv, user.role)}{" "}
              {!!conv._count?.messages && (
                <span className="ml-2 rounded bg-brand px-1.5 text-xs text-white">
                  {conv._count.messages}
                </span>
              )}
            </p>
            <p className="mt-0.5 truncate text-xs text-slate-500">
              {conv.messages[0]?.body ?? "Chưa có tin nhắn"}
            </p>
          </button>
        ))}
      </div>

      <div className="flex flex-col surface">
        {!selectedId ? (
          <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
            Chọn một cuộc trò chuyện để bắt đầu
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4">
              {messageQuery.hasNextPage && (
                <button
                  className="mb-3 text-xs text-brand"
                  disabled={messageQuery.isFetchingNextPage}
                  onClick={() => messageQuery.fetchNextPage()}
                >
                  Tải tin nhắn cũ hơn
                </button>
              )}
              <div className="flex flex-col gap-2">
                {messages?.map((m) => (
                  <div
                    key={m.id}
                    className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                      m.senderId === user.id
                        ? "ml-auto bg-brand text-white"
                        : "bg-slate-100 text-slate-800"
                    }`}
                  >
                    <p>{m.body}</p>
                    <p
                      className={`mt-1 text-[10px] ${
                        m.senderId === user.id
                          ? "text-white/70"
                          : "text-slate-400"
                      }`}
                    >
                      {new Date(m.createdAt).toLocaleTimeString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <form
              onSubmit={handleSend}
              className="flex gap-2 border-t border-slate-100 p-3"
            >
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Nhập tin nhắn..."
                className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              {sendMutation.error && (
                <p className="text-xs text-red-600">Gửi tin nhắn thất bại</p>
              )}
              <button
                type="submit"
                disabled={sendMutation.isPending}
                className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
              >
                Gửi
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
