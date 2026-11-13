import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../store/auth.store";
import { connectSocket, disconnectSocket } from "./socket";
import { refreshAccessToken } from "../api/client";

export function useRealtimeConnection() {
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user || !accessToken) {
      disconnectSocket();
      return;
    }

    const socket = connectSocket(accessToken);

    const handleNewNotification = () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    };

    socket.on("notification:new", handleNewNotification);
    const reconnect = (reason: string) => {
      if (reason === "io server disconnect") void refreshAccessToken();
    };
    socket.on("disconnect", reconnect);

    return () => {
      socket.off("notification:new", handleNewNotification);
      socket.off("disconnect", reconnect);
    };
  }, [user, accessToken, queryClient]);
}
