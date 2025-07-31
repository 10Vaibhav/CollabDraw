"use client"

import { useEffect, useState } from "react"
import { WS_URL } from "@/config"
import { Canvas } from "./Canvas"

export function RoomCanvas({ roomId, token }: { roomId: string; token: string }) {
  const [socket, setSocket] = useState<WebSocket | null>(null)

  if (!roomId) {
    return <div>Loading room...</div>;
  }

  useEffect(() => {
    const ws = new WebSocket(`${WS_URL}?token=${token}`)

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "join_room", roomId }))
      setSocket(ws)
    }

    ws.onerror = (err) => {
      console.error("WebSocket error:", err)
    }

    ws.onclose = () => {
      setSocket(null)
    }

    return () => {
      ws.close()
    }
  }, [roomId, token])

  if (!socket) {
    return <div>Connecting to the server...</div>
  }

  return <Canvas roomId={roomId} socket={socket} />
}