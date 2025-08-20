import type { Game } from "../Game";
import { getResizeHandle } from "../geometry";
import { beginResize } from "../resize";
import { findShapeAtPoint as findShapeAtPointFn } from "../selection";

export function createMouseDownHandler(game: Game) {
  return (e: MouseEvent) => {
    if (!game.isInitialized) {
      return;
    }

    const mouseX = e.offsetX;
    const mouseY = e.offsetY;

    if (game.selectedTool === "select") {
      const hitShapeIndex = findShapeAtPointFn(game.existingShapes, mouseX, mouseY);

      if (hitShapeIndex !== null) {
        game.selectedShapeIndex = hitShapeIndex;
        const shape = game.existingShapes[hitShapeIndex];

        const handle = getResizeHandle(mouseX, mouseY, shape);

        if (handle) {
          game.isResizing = true;
          game.resizeHandle = handle;
          game.resizeStartBounds = beginResize(shape);
          game.lastMouseX = mouseX;
          game.lastMouseY = mouseY;
        } else {
          game.isDragging = true;
          game.lastMouseX = mouseX;
          game.lastMouseY = mouseY;
        }

        game.redrawStaticShapes();
        game.redrawMainCanvas();
      } else {
        game.selectedShapeIndex = null;
        game.redrawStaticShapes();
        game.redrawMainCanvas();
      }
    } else if (game.selectedTool === "eraser") {
      game.isDrawing = true;
      game.eraserPath = [{ x: mouseX, y: mouseY }];
      game.eraseShapes(game.eraserPath);
    } else {
      game.isDrawing = true;
      game.startX = mouseX;
      game.startY = mouseY;
    }
  };
}


