import { IconButton } from "./IconButton";
import {Circle, Eraser, Pencil, RectangleHorizontalIcon} from "lucide-react"

type Shape = "circle"|"rect"|"line" |"eraser" ;
export function TopBar( {selectedTool,setSelectedTool}:{
    selectedTool : Shape,
    setSelectedTool : (s:Shape)=>void
}) {
  return (<div className="bg-gray-100 w-90 p-3 justify-center rounded-md flex gap-5">
   <IconButton icon={<Pencil/>} onClick={()=>{setSelectedTool("line")}} activated={selectedTool ==="line"} />
   <IconButton icon={<RectangleHorizontalIcon/>} onClick={()=>{setSelectedTool("rect")}} activated={selectedTool ==="rect"}/>
   <IconButton icon={<Circle/>} onClick={()=>{setSelectedTool("circle")}} activated={selectedTool ==="circle"}/>
   <IconButton icon={<Eraser/>} onClick={()=>{setSelectedTool("eraser")}} activated={selectedTool ==="eraser"}/>
  </div>
  )
}