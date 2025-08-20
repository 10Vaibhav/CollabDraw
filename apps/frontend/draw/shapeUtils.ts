import { Shape } from "./types";

export function shapesEqual(shape1: Shape, shape2: Shape): boolean {
  if (shape1.type !== shape2.type) return false;
  if (shape1.type === "rect" && shape2.type === "rect") {
    return shape1.x === shape2.x && shape1.y === shape2.y && shape1.width === shape2.width && shape1.height === shape2.height;
  }
  if (shape1.type === "circle" && shape2.type === "circle") {
    return shape1.centerX === shape2.centerX && shape1.centerY === shape2.centerY && shape1.radius === shape2.radius;
  }
  if (shape1.type === "line" && shape2.type === "line") {
    return shape1.startX === shape2.startX && shape1.startY === shape2.startY && shape1.endX === shape2.endX && shape1.endY === shape2.endY;
  }
  if (shape1.type === "arrow" && shape2.type === "arrow") {
    return shape1.startX === shape2.startX && shape1.startY === shape2.startY && shape1.endX === shape2.endX && shape1.endY === shape2.endY;
  }
  if (shape1.type === "diamond" && shape2.type === "diamond") {
    return shape1.centerX === shape2.centerX && shape1.centerY === shape2.centerY && shape1.width === shape2.width && shape1.height === shape2.height;
  }
  if (shape1.type === "ellipse" && shape2.type === "ellipse") {
    return shape1.centerX === shape2.centerX && shape1.centerY === shape2.centerY && shape1.radiusX === shape2.radiusX && shape1.radiusY === shape2.radiusY;
  }
  if (shape1.type === "parallelogram" && shape2.type === "parallelogram") {
    return shape1.x === shape2.x && shape1.y === shape2.y && shape1.width === shape2.width && shape1.height === shape2.height && shape1.skew === shape2.skew;
  }
  return false;
}


