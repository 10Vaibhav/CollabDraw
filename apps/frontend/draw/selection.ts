import { Shape } from "./types";
import { isPointInsideShape } from "./geometry";

export function findShapeAtPoint(shapes: (Shape & { id?: number })[], x: number, y: number): number | null {
  for (let i = shapes.length - 1; i >= 0; i--) {
    if (isPointInsideShape(shapes[i], x, y)) {
      return i;
    }
  }
  return null;
}

export function moveShapeBy(shapes: (Shape & { id?: number })[], shapeIndex: number, deltaX: number, deltaY: number, onRealtime?: (index: number) => void) {
  const shape = shapes[shapeIndex] as any;
  switch (shape.type) {
    case "rect":
    case "parallelogram":
      shape.x += deltaX;
      shape.y += deltaY;
      break;
    case "circle":
    case "diamond":
    case "ellipse":
      shape.centerX += deltaX;
      shape.centerY += deltaY;
      break;
    case "line":
    case "arrow":
      shape.startX += deltaX;
      shape.startY += deltaY;
      shape.endX += deltaX;
      shape.endY += deltaY;
      break;
  }
  if (onRealtime) onRealtime(shapeIndex);
}


