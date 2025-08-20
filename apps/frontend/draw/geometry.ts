import { Cordinate, ResizeHandle, Shape } from "./types";

export function getShapeBounds(shape: Shape): { x: number; y: number; width: number; height: number } | null {
  switch (shape.type) {
    case "rect":
      // Normalize so width/height are positive and (x,y) is top-left
      return {
        x: Math.min(shape.x, shape.x + shape.width),
        y: Math.min(shape.y, shape.y + shape.height),
        width: Math.abs(shape.width),
        height: Math.abs(shape.height),
      };
    case "circle":
      return {
        x: shape.centerX - shape.radius,
        y: shape.centerY - shape.radius,
        width: shape.radius * 2,
        height: shape.radius * 2,
      };
    case "line":
    case "arrow": {
      const minX = Math.min(shape.startX, shape.endX);
      const minY = Math.min(shape.startY, shape.endY);
      const maxX = Math.max(shape.startX, shape.endX);
      const maxY = Math.max(shape.startY, shape.endY);
      return {
        x: minX,
        y: minY,
        width: maxX - minX || 10,
        height: maxY - minY || 10,
      };
    }
    case "diamond": {
      const halfW = Math.abs(shape.width) / 2;
      const halfH = Math.abs(shape.height) / 2;
      return {
        x: shape.centerX - halfW,
        y: shape.centerY - halfH,
        width: Math.abs(shape.width),
        height: Math.abs(shape.height),
      };
    }
    case "ellipse":
      return {
        x: shape.centerX - shape.radiusX,
        y: shape.centerY - shape.radiusY,
        width: shape.radiusX * 2,
        height: shape.radiusY * 2,
      };
    case "parallelogram":
      // Normalize bounds for consistent handle placement
      return {
        x: Math.min(shape.x, shape.x + shape.width),
        y: Math.min(shape.y, shape.y + shape.height),
        width: Math.abs(shape.width),
        height: Math.abs(shape.height),
      };
    default:
      return null;
  }
}

export function getResizeHandle(x: number, y: number, shape: Shape): ResizeHandle {
  if (!shape) return null;
  const bounds = getShapeBounds(shape);
  if (!bounds) return null;

  const handleSize = 8;
  const tolerance = 4;

  const handles = [
    { x: bounds.x - handleSize / 2, y: bounds.y - handleSize / 2, handle: "nw" as ResizeHandle },
    { x: bounds.x + bounds.width - handleSize / 2, y: bounds.y - handleSize / 2, handle: "ne" as ResizeHandle },
    { x: bounds.x - handleSize / 2, y: bounds.y + bounds.height - handleSize / 2, handle: "sw" as ResizeHandle },
    { x: bounds.x + bounds.width - handleSize / 2, y: bounds.y + bounds.height - handleSize / 2, handle: "se" as ResizeHandle },
    { x: bounds.x + bounds.width / 2 - handleSize / 2, y: bounds.y - handleSize / 2, handle: "n" as ResizeHandle },
    { x: bounds.x + bounds.width / 2 - handleSize / 2, y: bounds.y + bounds.height - handleSize / 2, handle: "s" as ResizeHandle },
    { x: bounds.x - handleSize / 2, y: bounds.y + bounds.height / 2 - handleSize / 2, handle: "w" as ResizeHandle },
    { x: bounds.x + bounds.width - handleSize / 2, y: bounds.y + bounds.height / 2 - handleSize / 2, handle: "e" as ResizeHandle },
  ];

  for (const handle of handles) {
    if (
      x >= handle.x - tolerance &&
      x <= handle.x + handleSize + tolerance &&
      y >= handle.y - tolerance &&
      y <= handle.y + handleSize + tolerance
    ) {
      return handle.handle;
    }
  }
  return null;
}

export function calculateDistanceToLine(pt: Cordinate, x1: number, y1: number, x2: number, y2: number): number {
  const A = pt.x - x1;
  const B = pt.y - y1;
  const C = x2 - x1;
  const D = y2 - y1;
  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;
  if (lenSq !== 0) {
    param = dot / lenSq;
  }
  let xx, yy;
  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }
  return Math.hypot(pt.x - xx, pt.y - yy);
}

export function isPointNearRect(pt: Cordinate, rect: { x: number; y: number; width: number; height: number }, tolerance: number): boolean {
  // Normalize incoming rect first
  const normX = Math.min(rect.x, rect.x + rect.width);
  const normY = Math.min(rect.y, rect.y + rect.height);
  const normW = Math.abs(rect.width);
  const normH = Math.abs(rect.height);

  const outerX = normX - tolerance;
  const outerY = normY - tolerance;
  const outerW = normW + 2 * tolerance;
  const outerH = normH + 2 * tolerance;
  const innerX = normX + tolerance;
  const innerY = normY + tolerance;
  const innerW = normW - 2 * tolerance;
  const innerH = normH - 2 * tolerance;

  return (
    pt.x > outerX &&
    pt.x < outerX + outerW &&
    pt.y > outerY &&
    pt.y < outerY + outerH &&
    !(pt.x > innerX && pt.x < innerX + innerW && pt.y > innerY && pt.y < innerY + innerH)
  );
}

export function isPointNearDiamond(pt: Cordinate, diamond: { centerX: number; centerY: number; width: number; height: number }, tolerance: number): boolean {
  const halfW = Math.abs(diamond.width) / 2;
  const halfH = Math.abs(diamond.height) / 2;
  const top = { x: diamond.centerX, y: diamond.centerY - halfH };
  const right = { x: diamond.centerX + halfW, y: diamond.centerY };
  const bottom = { x: diamond.centerX, y: diamond.centerY + halfH };
  const left = { x: diamond.centerX - halfW, y: diamond.centerY };
  return (
    calculateDistanceToLine(pt, top.x, top.y, right.x, right.y) <= tolerance ||
    calculateDistanceToLine(pt, right.x, right.y, bottom.x, bottom.y) <= tolerance ||
    calculateDistanceToLine(pt, bottom.x, bottom.y, left.x, left.y) <= tolerance ||
    calculateDistanceToLine(pt, left.x, left.y, top.x, top.y) <= tolerance
  );
}

export function isPointNearEllipse(pt: Cordinate, ellipse: { centerX: number; centerY: number; radiusX: number; radiusY: number }, tolerance: number): boolean {
  const dx = pt.x - ellipse.centerX;
  const dy = pt.y - ellipse.centerY;
  const normalizedDist = (dx * dx) / (ellipse.radiusX * ellipse.radiusX) + (dy * dy) / (ellipse.radiusY * ellipse.radiusY);
  return Math.abs(normalizedDist - 1) <= tolerance / Math.min(ellipse.radiusX, ellipse.radiusY);
}

export function isPointNearParallelogram(pt: Cordinate, para: { x: number; y: number; width: number; height: number; skew: number }, tolerance: number): boolean {
  const topLeft = { x: para.x + para.skew, y: para.y };
  const topRight = { x: para.x + para.width + para.skew, y: para.y };
  const bottomRight = { x: para.x + para.width, y: para.y + para.height };
  const bottomLeft = { x: para.x, y: para.y + para.height };
  return (
    calculateDistanceToLine(pt, topLeft.x, topLeft.y, topRight.x, topRight.y) <= tolerance ||
    calculateDistanceToLine(pt, topRight.x, topRight.y, bottomRight.x, bottomRight.y) <= tolerance ||
    calculateDistanceToLine(pt, bottomRight.x, bottomRight.y, bottomLeft.x, bottomLeft.y) <= tolerance ||
    calculateDistanceToLine(pt, bottomLeft.x, bottomLeft.y, topLeft.x, topLeft.y) <= tolerance
  );
}

export function isPointInsideShape(shape: Shape, x: number, y: number): boolean {
  const tolerance = 10;
  switch (shape.type) {
    case "rect":
      // Use normalized bounds for hit-testing
      const bounds = getShapeBounds(shape);
      if (!bounds) return false;
      return (
        x >= bounds.x - tolerance &&
        x <= bounds.x + bounds.width + tolerance &&
        y >= bounds.y - tolerance &&
        y <= bounds.y + bounds.height + tolerance
      );
    case "circle": {
      const distFromCenter = Math.hypot(x - shape.centerX, y - shape.centerY);
      return distFromCenter <= shape.radius + tolerance;
    }
    case "line":
    case "arrow":
      return calculateDistanceToLine({ x, y }, shape.startX, shape.startY, shape.endX, shape.endY) <= tolerance;
    case "diamond":
      return isPointNearDiamond({ x, y }, shape, tolerance);
    case "ellipse":
      return isPointNearEllipse({ x, y }, shape, tolerance);
    case "parallelogram":
      return isPointNearParallelogram({ x, y }, shape, tolerance);
    default:
      return false;
  }
}

export function getShapeProps(shape: Shape): any {
  const bounds = getShapeBounds(shape);
  const props: any = { ...bounds };
  if (shape.type === "line" || shape.type === "arrow") {
    Object.assign(props, {
      startX: shape.startX,
      startY: shape.startY,
      endX: shape.endX,
      endY: shape.endY,
    });
  }
  return props;
}


