import { IconButton } from "./IconButton";
import {
  Circle,
  Eraser,
  Pencil,
  RectangleHorizontalIcon,
  ArrowRight,
  Diamond,
  Shapes,
  Hexagon,
  MousePointer
} from "lucide-react";

type Tool = 
  | "circle"
  | "rect"
  | "line" 
  | "eraser"
  | "arrow"
  | "diamond"
  | "ellipse"
  | "parallelogram"
  | "select";

// Mobile detection
function isMobile() {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= 768;
}

export function TopBar({ selectedTool, setSelectedTool }: {
  selectedTool: Tool,
  setSelectedTool: (s: Tool) => void
}) {
  const mobile = isMobile();
  
  return (
    <div className={`bg-white/95 backdrop-blur-sm shadow-xl border border-gray-200 rounded-2xl px-4 py-3 mx-2 max-w-full ${
      mobile ? 'max-w-sm' : 'px-6 py-4 mx-4'
    }`}>
      {/* Mobile responsive grid - 3 rows on mobile, 1 on desktop */}
      <div className={`grid gap-2 w-full justify-items-center ${
        mobile 
          ? 'grid-cols-3 sm:grid-cols-5' 
          : 'grid-cols-3 sm:grid-cols-9 gap-3 sm:gap-4'
      }`}>
        {/* Selection tool - first for easy access */}
        <IconButton 
          icon={<MousePointer size={mobile ? 18 : 20} />} 
          onClick={() => { setSelectedTool("select") }} 
          activated={selectedTool === "select"} 
        />
        
        {/* Basic drawing shapes */}
        <IconButton 
          icon={<Pencil size={mobile ? 18 : 20} />} 
          onClick={() => { setSelectedTool("line") }} 
          activated={selectedTool === "line"} 
        />
        <IconButton 
          icon={<RectangleHorizontalIcon size={mobile ? 18 : 20} />} 
          onClick={() => { setSelectedTool("rect") }} 
          activated={selectedTool === "rect"}
        />
        <IconButton 
          icon={<Circle size={mobile ? 18 : 20} />} 
          onClick={() => { setSelectedTool("circle") }} 
          activated={selectedTool === "circle"}
        />
        <IconButton 
          icon={<Eraser size={mobile ? 18 : 20} />} 
          onClick={() => { setSelectedTool("eraser") }} 
          activated={selectedTool === "eraser"}
        />
        
        {/* Advanced shapes - show fewer on mobile */}
        {!mobile && (
          <>
            <IconButton 
              icon={<ArrowRight size={20} />} 
              onClick={() => { setSelectedTool("arrow") }} 
              activated={selectedTool === "arrow"}
            />
            <IconButton 
              icon={<Diamond size={20} />} 
              onClick={() => { setSelectedTool("diamond") }} 
              activated={selectedTool === "diamond"}
            />
            <IconButton 
              icon={<Shapes size={20} />} 
              onClick={() => { setSelectedTool("ellipse") }} 
              activated={selectedTool === "ellipse"}
            />
            <IconButton 
              icon={<Hexagon size={20} />} 
              onClick={() => { setSelectedTool("parallelogram") }} 
              activated={selectedTool === "parallelogram"}
            />
          </>
        )}
      </div>
      
      {/* Show additional tools on mobile in a second row */}
      {mobile && (
        <div className="grid grid-cols-4 gap-2 w-full justify-items-center mt-2">
          <IconButton 
            icon={<ArrowRight size={18} />} 
            onClick={() => { setSelectedTool("arrow") }} 
            activated={selectedTool === "arrow"}
          />
          <IconButton 
            icon={<Diamond size={18} />} 
            onClick={() => { setSelectedTool("diamond") }} 
            activated={selectedTool === "diamond"}
          />
          <IconButton 
            icon={<Shapes size={18} />} 
            onClick={() => { setSelectedTool("ellipse") }} 
            activated={selectedTool === "ellipse"}
          />
          <IconButton 
            icon={<Hexagon size={18} />} 
            onClick={() => { setSelectedTool("parallelogram") }} 
            activated={selectedTool === "parallelogram"}
          />
        </div>
      )}
      
      {/* Tool name display and status - hidden on mobile to save space */}
      <div className="hidden md:block mt-3 text-center">
        <span className="text-sm text-gray-700 font-medium">
          {selectedTool === "select" && "🖱️ Select & Resize"}
          {selectedTool === "line" && "📏 Line Tool"}
          {selectedTool === "rect" && "⬜ Rectangle"}
          {selectedTool === "circle" && "⭕ Circle"}
          {selectedTool === "eraser" && "🧹 Eraser"}
          {selectedTool === "arrow" && "➡️ Arrow"}
          {selectedTool === "diamond" && "💎 Diamond"}
          {selectedTool === "ellipse" && "🥚 Ellipse"}
          {selectedTool === "parallelogram" && "📐 Parallelogram"}
        </span>
      </div>
      
      {/* Real-time collaboration indicator - smaller on mobile */}
      <div className={`flex items-center justify-center ${mobile ? 'mt-1' : 'mt-2'}`}>
        <div className={`flex items-center gap-2 font-medium text-green-600 ${
          mobile ? 'text-xs' : 'text-xs'
        }`}>
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span>{mobile ? 'Live' : 'Real-time Collaboration Active'}</span>
        </div>
      </div>
    </div>
  )
}