import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LucideLogOut } from "lucide-react";

import { TopBar } from "./TopBar";
import { Game } from "@/draw/Game";
import { IconButton } from "./IconButton";

export type Tool = "circle" | "rect" | "line" | "eraser";

export function Canvas({
  roomId,
  socket,
}: {
  roomId: string;
  socket: WebSocket;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [selectedTool, setSelectedTool] = useState<Tool>("circle");
  const router = useRouter(); // Initialize game instance when canvas mounts

  useLayoutEffect(() => {
    // Ensure we don't initialize the game without a valid room ID.
    if (gameRef.current || !roomId) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const game = new Game(canvas, roomId, socket);
    gameRef.current = game;

    return () => {
      gameRef.current?.destroy();
      gameRef.current = null;
    };
  }, [roomId, socket]); // This dependency array is correct for this purpose.
  // Update tool in active game

  useEffect(() => {
    // ✅ This hook now correctly handles the initial tool set AND all subsequent updates.
    gameRef.current?.setTool(selectedTool);
  }, [selectedTool]); // Handle logout + room cleanup

  const handleLogout = () => {
    gameRef.current?.destroy();
    gameRef.current = null;
    router.replace("/dashboard");
  };

  return (
    <div className="overflow-hidden flex justify-center">
      {/* ... rest of your component is fine ... */}
      {" "}
      <canvas
        ref={canvasRef}
        width={typeof window !== "undefined" ? window.innerWidth : 800}
        height={typeof window !== "undefined" ? window.innerHeight : 600}
        className="bg-black"
      />
      {" "}
      <div className="fixed top-0 mt-5">
        {" "}
        <TopBar selectedTool={selectedTool} setSelectedTool={setSelectedTool} />
        {" "}
      </div>
      {" "}
      <div className="bg-white w-10 rounded-lg absolute bottom-1 right-1 mb-10 mr-10">
        <IconButton icon={<LucideLogOut />} onClick={handleLogout} />   
        {" "}
      </div>
      {" "}
    </div>
  );
}
