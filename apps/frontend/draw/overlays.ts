import { Shape } from "./types";

export function createRectOverlay(startX: number, startY: number, currX: number, currY: number): Shape {
  return { type: "rect", x: startX, y: startY, width: currX - startX, height: currY - startY };
}

export function createCircleOverlay(startX: number, startY: number, currX: number, currY: number): Shape {
  const radius = Math.hypot(currX - startX, currY - startY) / 2;
  return { type: "circle", centerX: (startX + currX) / 2, centerY: (startY + currY) / 2, radius };
}

export function createLineOverlay(startX: number, startY: number, currX: number, currY: number): Shape {
  return { type: "line", startX, startY, endX: currX, endY: currY };
}

export function createArrowOverlay(startX: number, startY: number, currX: number, currY: number): Shape {
  return { type: "arrow", startX, startY, endX: currX, endY: currY };
}

export function createDiamondOverlay(startX: number, startY: number, currX: number, currY: number): Shape {
  return { type: "diamond", centerX: (startX + currX) / 2, centerY: (startY + currY) / 2, width: currX - startX, height: currY - startY };
}

export function createEllipseOverlay(startX: number, startY: number, currX: number, currY: number): Shape {
  return { type: "ellipse", centerX: (startX + currX) / 2, centerY: (startY + currY) / 2, radiusX: Math.abs(currX - startX) / 2, radiusY: Math.abs(currY - startY) / 2 };
}

export function createParallelogramOverlay(startX: number, startY: number, currX: number, currY: number): Shape {
  const width = currX - startX;
  const height = currY - startY;
  const skew = width * 0.2;
  return { type: "parallelogram", x: startX, y: startY, width, height, skew };
}


