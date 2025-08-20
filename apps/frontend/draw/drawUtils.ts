import { Shape } from "./types";

export function drawShape(ctx: CanvasRenderingContext2D, shape: Shape, isSelected: boolean = false) {
  if (!ctx || !shape) return;
  ctx.save();
  if (isSelected) {
    ctx.strokeStyle = "#00ff00";
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 5]);
  } else {
    ctx.strokeStyle = "rgba(255,255,255)";
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
  }
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  switch (shape.type) {
    case "rect":
      ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
      break;
    case "circle":
      ctx.beginPath();
      ctx.arc(shape.centerX, shape.centerY, shape.radius, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case "line":
      ctx.beginPath();
      ctx.moveTo(shape.startX, shape.startY);
      ctx.lineTo(shape.endX, shape.endY);
      ctx.stroke();
      break;
    case "arrow":
      drawArrow(ctx, shape.startX, shape.startY, shape.endX, shape.endY);
      break;
    case "diamond":
      drawDiamond(ctx, shape.centerX, shape.centerY, shape.width, shape.height);
      break;
    case "ellipse":
      ctx.beginPath();
      ctx.ellipse(shape.centerX, shape.centerY, shape.radiusX, shape.radiusY, 0, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case "parallelogram":
      drawParallelogram(ctx, shape.x, shape.y, shape.width, shape.height, shape.skew);
      break;
    default:
      break;
  }
  ctx.restore();
}

export function drawArrow(ctx: CanvasRenderingContext2D, startX: number, startY: number, endX: number, endY: number) {
  const headLength = 15;
  const headAngle = Math.PI / 6;
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.stroke();
  const angle = Math.atan2(endY - startY, endX - startX);
  ctx.beginPath();
  ctx.moveTo(endX, endY);
  ctx.lineTo(endX - headLength * Math.cos(angle - headAngle), endY - headLength * Math.sin(angle - headAngle));
  ctx.moveTo(endX, endY);
  ctx.lineTo(endX - headLength * Math.cos(angle + headAngle), endY - headLength * Math.sin(angle + headAngle));
  ctx.stroke();
}

export function drawDiamond(ctx: CanvasRenderingContext2D, centerX: number, centerY: number, width: number, height: number) {
  const halfWidth = Math.abs(width) / 2;
  const halfHeight = Math.abs(height) / 2;
  ctx.beginPath();
  ctx.moveTo(centerX, centerY - halfHeight);
  ctx.lineTo(centerX + halfWidth, centerY);
  ctx.lineTo(centerX, centerY + halfHeight);
  ctx.lineTo(centerX - halfWidth, centerY);
  ctx.closePath();
  ctx.stroke();
}

export function drawParallelogram(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, skew: number) {
  ctx.beginPath();
  ctx.moveTo(x + skew, y);
  ctx.lineTo(x + width + skew, y);
  ctx.lineTo(x + width, y + height);
  ctx.lineTo(x, y + height);
  ctx.closePath();
  ctx.stroke();
}

export function drawEraserPath(ctx: CanvasRenderingContext2D, path: { x: number; y: number }[]) {
  if (!path || path.length === 0) return;
  ctx.save();
  ctx.strokeStyle = "rgba(255,0,0,0.5)";
  ctx.lineWidth = 10;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  if (path.length > 0) {
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) {
      ctx.lineTo(path[i].x, path[i].y);
    }
  }
  ctx.stroke();
  ctx.restore();
}


