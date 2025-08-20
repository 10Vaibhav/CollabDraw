import { Shape } from "../types";
import { drawShape, drawEraserPath } from "../drawUtils";
import { getShapeBounds } from "../geometry";

export function redrawStaticShapes(
  offscreenCtx: CanvasRenderingContext2D,
  offscreen: HTMLCanvasElement,
  shapes: (Shape & { id?: number })[],
  selectedShapeIndex: number | null
) {
  offscreenCtx.clearRect(0, 0, offscreen.width, offscreen.height);
  shapes.forEach((shape, index) => {
    const isSelected = selectedShapeIndex === index;
    drawShape(offscreenCtx, shape, isSelected);
  });
}

export function redrawMainCanvas(
  ctx: CanvasRenderingContext2D,
  offscreen: HTMLCanvasElement,
  shapes: (Shape & { id?: number })[],
  selectedTool: string,
  selectedShapeIndex: number | null,
  overlayShape?: Shape,
  currentEraserPath?: { x: number; y: number }[]
) {
  ctx.save();
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.drawImage(offscreen, 0, 0);

  if (overlayShape && overlayShape.type !== "eraser") {
    drawShape(ctx, overlayShape);
  }

  if (currentEraserPath && currentEraserPath.length > 1) {
    drawEraserPath(ctx, currentEraserPath);
  }

  if (selectedShapeIndex !== null && selectedTool === "select") {
    drawResizeHandles(ctx, shapes[selectedShapeIndex]);
  }

  ctx.restore();
}

export function drawResizeHandles(ctx: CanvasRenderingContext2D, shape: Shape) {
  if (!shape) return;

  const handleSize = 8;
  const bounds = getShapeBounds(shape);
  if (!bounds) return;

  ctx.save();
  ctx.fillStyle = "#00ff00";
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1;

  const handles = [
    { x: bounds.x - handleSize / 2, y: bounds.y - handleSize / 2 },
    { x: bounds.x + bounds.width - handleSize / 2, y: bounds.y - handleSize / 2 },
    { x: bounds.x - handleSize / 2, y: bounds.y + bounds.height - handleSize / 2 },
    { x: bounds.x + bounds.width - handleSize / 2, y: bounds.y + bounds.height - handleSize / 2 },
    { x: bounds.x + bounds.width / 2 - handleSize / 2, y: bounds.y - handleSize / 2 },
    { x: bounds.x + bounds.width / 2 - handleSize / 2, y: bounds.y + bounds.height - handleSize / 2 },
    { x: bounds.x - handleSize / 2, y: bounds.y + bounds.height / 2 - handleSize / 2 },
    { x: bounds.x + bounds.width - handleSize / 2, y: bounds.y + bounds.height / 2 - handleSize / 2 },
  ];

  handles.forEach((h) => {
    ctx.fillRect(h.x, h.y, handleSize, handleSize);
    ctx.strokeRect(h.x, h.y, handleSize, handleSize);
  });

  ctx.restore();
}


