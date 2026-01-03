
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LucideLogOut } from "lucide-react";

import { TopBar } from "./TopBar";
import { Game } from "@/draw/Game";
import { IconButton } from "./IconButton";
import { getOptimalCanvasSize, setupMobileViewport, isMobileDevice } from "@/utils/mobileUtils";

export type Tool = "rect" | "line" | "circle" | "eraser" | "arrow" | "diamond" | "ellipse" | "parallelogram" | "select";


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
  const [canvasSize, setCanvasSize] = useState(() => getOptimalCanvasSize());
  const router = useRouter();

  // Setup mobile viewport and handle resize
  useEffect(() => {
    setupMobileViewport();

    const handleResize = () => {
      setCanvasSize(getOptimalCanvasSize());
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  // Initialize game instance when canvas mounts
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
  }, [roomId, socket]);

  // Update canvas size when it changes
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && gameRef.current) {
      canvas.width = canvasSize.width;
      canvas.height = canvasSize.height;
      
      // Redraw after resize
      gameRef.current.redrawStaticShapes();
      gameRef.current.redrawMainCanvas();
    }
  }, [canvasSize]);

  // Update tool in active game
  useEffect(() => {
    gameRef.current?.setTool(selectedTool);
  }, [selectedTool]);

  // Handle logout + room cleanup
  const handleLogout = () => {
    gameRef.current?.destroy();
    gameRef.current = null;
    router.replace("/dashboard");
  };

  const isMobile = isMobileDevice();

  return (
    <div className="overflow-hidden flex justify-center relative">
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        className="bg-black touch-none" // touch-none prevents default touch behaviors
        style={{
          touchAction: 'none', // Additional prevention of default touch behaviors
          maxWidth: '100vw',
          maxHeight: '100vh'
        }}
      />
      
      {/* Mobile-optimized toolbar positioning */}
      <div className={`fixed ${isMobile ? 'bottom-4 left-1/2 transform -translate-x-1/2' : 'top-0 mt-5'}`}>
        <TopBar selectedTool={selectedTool} setSelectedTool={setSelectedTool} />
      </div>
      
      {/* Logout button - adjusted for mobile */}
      <div className={`bg-white w-10 rounded-lg absolute ${
        isMobile 
          ? 'top-4 right-4' 
          : 'bottom-1 right-1 mb-10 mr-10'
      }`}>
        <IconButton icon={<LucideLogOut />} onClick={handleLogout} />
      </div>
    </div>
  );
}