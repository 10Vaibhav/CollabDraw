import { IconButton } from "./IconButton";
import {
  Circle,
  Eraser,
  Pencil,
  RectangleHorizontalIcon,
  ArrowRight,
  Diamond,
  Shapes,
  Hexagon
} from "lucide-react";

type Shape = 
  | "circle"
  | "rect"
  | "line" 
  | "eraser"
  | "arrow"
  | "diamond"
  | "ellipse"
  | "parallelogram";

export function TopBar({ selectedTool, setSelectedTool }: {
  selectedTool: Shape,
  setSelectedTool: (s: Shape) => void
}) {
  return (
    <div className="bg-white/90 backdrop-blur-sm shadow-lg border border-gray-200 rounded-xl px-4 py-3 mx-4 max-w-full">
      {/* Mobile responsive grid */}
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 sm:gap-3 w-full justify-items-center">
        {/* Basic shapes */}
        <IconButton 
          icon={<Pencil size={18} />} 
          onClick={() => { setSelectedTool("line") }} 
          activated={selectedTool === "line"} 
        />
        <IconButton 
          icon={<RectangleHorizontalIcon size={18} />} 
          onClick={() => { setSelectedTool("rect") }} 
          activated={selectedTool === "rect"}
        />
        <IconButton 
          icon={<Circle size={18} />} 
          onClick={() => { setSelectedTool("circle") }} 
          activated={selectedTool === "circle"}
        />
        <IconButton 
          icon={<Eraser size={18} />} 
          onClick={() => { setSelectedTool("eraser") }} 
          activated={selectedTool === "eraser"}
        />
        
        {/* Flowchart shapes - second row on mobile */}
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
      
      {/* Optional: Tool name display on larger screens */}
      <div className="hidden sm:block mt-2 text-center">
        <span className="text-xs text-gray-600 font-medium">
          {selectedTool === "line" && "Line"}
          {selectedTool === "rect" && "Rectangle"}
          {selectedTool === "circle" && "Circle"}
          {selectedTool === "eraser" && "Eraser"}
          {selectedTool === "arrow" && "Arrow"}
          {selectedTool === "diamond" && "Diamond"}
          {selectedTool === "ellipse" && "Ellipse"}
          {selectedTool === "parallelogram" && "Parallelogram"}
        </span>
      </div>
    </div>
  )
}