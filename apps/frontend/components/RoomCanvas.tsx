"use client"

"use client";

import { useEffect, useState } from "react";
import { WS_URL } from "@/config";
import { Canvas } from "./Canvas";
import { getCookies } from "@/auth/auth";

export function RoomCanvas({ roomId }: { roomId: string }) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [token, setToken] = useState<string | undefined>(undefined);

  useEffect(() => {
    async function fetchToken() {
      const t = await getCookies();
      setToken(t);
    }
    fetchToken();
  }, []);

  useEffect(() => {
    if (!roomId || !token) {
      return;
    }

    const ws = new WebSocket(`${WS_URL}?token=${token}`);

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "join_room", roomId }));
      setSocket(ws);
    };

    ws.onerror = (err) => {
      console.error("WebSocket error:", err);
    };

    ws.onclose = () => {
      setSocket(null);
    };

    return () => {
      ws.close();
    };
  }, [roomId, token]);

  if (!socket || !token) {
    return <div>Connecting to the server...</div>;
  }

  return <Canvas roomId={roomId} socket={socket} />;
}