import { ResizeHandle, Shape } from "./types";
import { getShapeProps } from "./geometry";

export function resizeShape(shapes: (Shape & { id?: number })[], shapeIndex: number, handle: ResizeHandle, deltaX: number, deltaY: number, resizeStartBounds: any) {
  const shape = shapes[shapeIndex] as any;
  const originalBounds = resizeStartBounds;
  if (!originalBounds) return;
  switch (shape.type) {
    case "rect":
    case "parallelogram":
      resizeRectangularShape(shape, handle, deltaX, deltaY, originalBounds);
      break;
    case "circle":
      resizeCircle(shape, handle, deltaX, deltaY, originalBounds);
      break;
    case "diamond":
      resizeDiamond(shape, handle, deltaX, deltaY, originalBounds);
      break;
    case "ellipse":
      resizeEllipse(shape, handle, deltaX, deltaY, originalBounds);
      break;
    case "line":
    case "arrow":
      resizeLine(shape, handle, deltaX, deltaY, originalBounds);
      break;
  }
}

export function beginResize(shape: Shape) {
  return getShapeProps(shape);
}

function resizeRectangularShape(shape: any, handle: ResizeHandle, deltaX: number, deltaY: number, originalBounds: any) {
  const newBounds = { ...originalBounds };
  switch (handle) {
    case "nw":
      newBounds.x += deltaX;
      newBounds.y += deltaY;
      newBounds.width -= deltaX;
      newBounds.height -= deltaY;
      break;
    case "ne":
      newBounds.y += deltaY;
      newBounds.width += deltaX;
      newBounds.height -= deltaY;
      break;
    case "sw":
      newBounds.x += deltaX;
      newBounds.width -= deltaX;
      newBounds.height += deltaY;
      break;
    case "se":
      newBounds.width += deltaX;
      newBounds.height += deltaY;
      break;
    case "n":
      newBounds.y += deltaY;
      newBounds.height -= deltaY;
      break;
    case "s":
      newBounds.height += deltaY;
      break;
    case "w":
      newBounds.x += deltaX;
      newBounds.width -= deltaX;
      break;
    case "e":
      newBounds.width += deltaX;
      break;
  }
  if (Math.abs(newBounds.width) < 10) newBounds.width = Math.sign(newBounds.width) * 10 || 10;
  if (Math.abs(newBounds.height) < 10) newBounds.height = Math.sign(newBounds.height) * 10 || 10;
  shape.x = newBounds.x;
  shape.y = newBounds.y;
  shape.width = newBounds.width;
  shape.height = newBounds.height;
}

function resizeCircle(shape: any, handle: ResizeHandle, deltaX: number, deltaY: number, originalBounds: any) {
  let newRadius = originalBounds.width / 2;
  switch (handle) {
    case "e":
    case "w":
      newRadius = Math.abs(originalBounds.width / 2 + (handle === "e" ? deltaX : -deltaX));
      break;
    case "n":
    case "s":
      newRadius = Math.abs(originalBounds.height / 2 + (handle === "s" ? deltaY : -deltaY));
      break;
    case "ne":
    case "nw":
    case "se":
    case "sw": {
      const avgDelta = (Math.abs(deltaX) + Math.abs(deltaY)) / 2;
      newRadius = Math.abs(originalBounds.width / 2 + avgDelta);
      break;
    }
  }
  if (newRadius < 5) newRadius = 5;
  shape.radius = newRadius;
}

function resizeDiamond(shape: any, handle: ResizeHandle, deltaX: number, deltaY: number, originalBounds: any) {
  let newWidth = originalBounds.width;
  let newHeight = originalBounds.height;
  switch (handle) {
    case "e":
    case "w":
      newWidth = Math.abs(originalBounds.width + (handle === "e" ? deltaX * 2 : -deltaX * 2));
      break;
    case "n":
    case "s":
      newHeight = Math.abs(originalBounds.height + (handle === "s" ? deltaY * 2 : -deltaY * 2));
      break;
    case "ne":
    case "nw":
    case "se":
    case "sw":
      newWidth = Math.abs(originalBounds.width + deltaX * 2);
      newHeight = Math.abs(originalBounds.height + deltaY * 2);
      break;
  }
  if (newWidth < 10) newWidth = 10;
  if (newHeight < 10) newHeight = 10;
  shape.width = newWidth * Math.sign(originalBounds.width);
  shape.height = newHeight * Math.sign(originalBounds.height);
}

function resizeEllipse(shape: any, handle: ResizeHandle, deltaX: number, deltaY: number, originalBounds: any) {
  let newRadiusX = originalBounds.width / 2;
  let newRadiusY = originalBounds.height / 2;
  switch (handle) {
    case "e":
    case "w":
      newRadiusX = Math.abs(originalBounds.width / 2 + (handle === "e" ? deltaX : -deltaX));
      break;
    case "n":
    case "s":
      newRadiusY = Math.abs(originalBounds.height / 2 + (handle === "s" ? deltaY : -deltaY));
      break;
    case "ne":
    case "nw":
    case "se":
    case "sw":
      newRadiusX = Math.abs(originalBounds.width / 2 + deltaX);
      newRadiusY = Math.abs(originalBounds.height / 2 + deltaY);
      break;
  }
  if (newRadiusX < 5) newRadiusX = 5;
  if (newRadiusY < 5) newRadiusY = 5;
  shape.radiusX = newRadiusX;
  shape.radiusY = newRadiusY;
}

function resizeLine(shape: any, handle: ResizeHandle, deltaX: number, deltaY: number, originalBounds: any) {
  const originalStartX = originalBounds.startX || Math.min(shape.startX, shape.endX);
  const originalStartY = originalBounds.startY || Math.min(shape.startY, shape.endY);
  const originalEndX = originalBounds.endX || Math.max(shape.startX, shape.endX);
  const originalEndY = originalBounds.endY || Math.max(shape.startY, shape.endY);
  switch (handle) {
    case "nw":
    case "n":
    case "w":
      shape.startX = originalStartX + deltaX;
      shape.startY = originalStartY + deltaY;
      break;
    case "ne":
    case "e":
      shape.endX = originalEndX + deltaX;
      shape.startY = originalStartY + deltaY;
      break;
    case "sw":
    case "s":
      shape.startX = originalStartX + deltaX;
      shape.endY = originalEndY + deltaY;
      break;
    case "se":
      shape.endX = originalEndX + deltaX;
      shape.endY = originalEndY + deltaY;
      break;
  }
}


