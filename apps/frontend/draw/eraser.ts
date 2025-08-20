import { Cordinate, Shape } from "./types";
import { isPointNearRect, isPointNearDiamond, isPointNearEllipse, isPointNearParallelogram, calculateDistanceToLine } from "./geometry";

export function isShapeErased(shape: Shape, pt: Cordinate, tolerance: number): boolean {
  switch (shape.type) {
    case "rect":
      return isPointNearRect(pt, shape as any, tolerance);
    case "circle": {
      const dist = Math.hypot((shape as any).centerX - pt.x, (shape as any).centerY - pt.y);
      return Math.abs(dist - (shape as any).radius) <= tolerance;
    }
    case "line":
    case "arrow":
      return calculateDistanceToLine(pt, (shape as any).startX, (shape as any).startY, (shape as any).endX, (shape as any).endY) <= tolerance;
    case "diamond":
      return isPointNearDiamond(pt, shape as any, tolerance);
    case "ellipse":
      return isPointNearEllipse(pt, shape as any, tolerance);
    case "parallelogram":
      return isPointNearParallelogram(pt, shape as any, tolerance);
    default:
      return false;
  }
}

export function eraseShapesLocal(
  shapes: (Shape & { id?: number })[],
  points: Cordinate[],
  eraseTolerance = 15
): { kept: (Shape & { id?: number })[]; deletedIds: number[]; erased: boolean } {
  const idsToAttemptDeletion: number[] = [];
  const shapesToKeep: (Shape & { id?: number })[] = [];
  let shapesWereErased = false;

  shapes.forEach((shape) => {
    const isErased = points.some((pt) => isShapeErased(shape, pt, eraseTolerance));
    if (isErased) {
      if (shape.id !== undefined) idsToAttemptDeletion.push(shape.id);
      shapesWereErased = true;
    } else {
      shapesToKeep.push(shape);
    }
  });

  return { kept: shapesToKeep, deletedIds: idsToAttemptDeletion, erased: shapesWereErased };
}


