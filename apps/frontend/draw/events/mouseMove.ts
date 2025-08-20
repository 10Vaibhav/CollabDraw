import type { Game } from "../Game";
import { getResizeHandle, isPointInsideShape } from "../geometry";
import { resizeShape as resizeShapeFn } from "../resize";
import { createRectOverlay, createCircleOverlay, createLineOverlay, createArrowOverlay, createDiamondOverlay, createEllipseOverlay, createParallelogramOverlay } from "../overlays";
import { moveShapeBy as moveShapeByFn } from "../selection";
import type { Shape } from "../types";

export function createMouseMoveHandler(game: Game) {
  return (e: MouseEvent) => {
    if (!game.isInitialized) return;

    const currX = e.offsetX;
    const currY = e.offsetY;

    if (game.selectedTool === "select") {
      if (game.isDragging && game.selectedShapeIndex !== null) {
        const deltaX = currX - game.lastMouseX;
        const deltaY = currY - game.lastMouseY;

        moveShapeByFn(
          game.existingShapes,
          game.selectedShapeIndex,
          deltaX,
          deltaY,
          (idx) => game.sync.sendRealtimeUpdate(idx)
        );

        game.lastMouseX = currX;
        game.lastMouseY = currY;

        game.redrawStaticShapes();
        game.redrawMainCanvas();
        return;
      } else if (game.isResizing && game.selectedShapeIndex !== null && game.resizeHandle) {
        const deltaX = currX - game.lastMouseX;
        const deltaY = currY - game.lastMouseY;

        resizeShapeFn(
          game.existingShapes,
          game.selectedShapeIndex,
          game.resizeHandle,
          deltaX,
          deltaY,
          game.resizeStartBounds
        );

        game.redrawStaticShapes();
        game.redrawMainCanvas();

        game.sync.sendRealtimeUpdate(game.selectedShapeIndex);
        return;
      } else {
        if (game.selectedShapeIndex !== null) {
          const shape = game.existingShapes[game.selectedShapeIndex];
          const handle = getResizeHandle(currX, currY, shape);

          if (handle) {
            const cursors: Record<string, string> = {
              nw: "nw-resize",
              ne: "ne-resize",
              sw: "sw-resize",
              se: "se-resize",
              n: "n-resize",
              s: "s-resize",
              e: "e-resize",
              w: "w-resize",
            };
            game.canvas.style.cursor = cursors[handle] || "pointer";
          } else if (isPointInsideShape(shape, currX, currY)) {
            game.canvas.style.cursor = "move";
          } else {
            game.canvas.style.cursor = "default";
          }
        } else {
          game.canvas.style.cursor = "default";
        }
      }
    } else {
      game.canvas.style.cursor = "crosshair";
    }

    if (!game.isDrawing) return;

    if (game.selectedTool === "eraser") {
      game.eraserPath.push({ x: currX, y: currY });
      game.eraseShapes(game.eraserPath);
      game.redrawMainCanvas(undefined, game.eraserPath);
    } else {
      let overlayShape: Shape | undefined;
      switch (game.selectedTool) {
        case "rect":
          overlayShape = createRectOverlay(game.startX, game.startY, currX, currY);
          break;
        case "circle":
          overlayShape = createCircleOverlay(game.startX, game.startY, currX, currY);
          break;
        case "line":
          overlayShape = createLineOverlay(game.startX, game.startY, currX, currY);
          break;
        case "arrow":
          overlayShape = createArrowOverlay(game.startX, game.startY, currX, currY);
          break;
        case "diamond":
          overlayShape = createDiamondOverlay(game.startX, game.startY, currX, currY);
          break;
        case "ellipse":
          overlayShape = createEllipseOverlay(game.startX, game.startY, currX, currY);
          break;
        case "parallelogram":
          overlayShape = createParallelogramOverlay(game.startX, game.startY, currX, currY);
          break;
      }
      game.redrawMainCanvas(overlayShape);
    }
  };
}


