import type { Game } from "../Game";
import type { Shape } from "../types";

export function createMouseUpHandler(game: Game) {
  return (e: MouseEvent) => {
    if (!game.isInitialized) {
      return;
    }

    if (game.selectedTool === "select") {
      if (game.isDragging) {
        game.isDragging = false;
        if (game.selectedShapeIndex !== null) {
          game.sync.sendDatabaseUpdate(game.selectedShapeIndex);
        }
      } else if (game.isResizing) {
        game.isResizing = false;
        game.resizeHandle = null;
        game.resizeStartBounds = null;
        if (game.selectedShapeIndex !== null) {
          game.sync.sendDatabaseUpdate(game.selectedShapeIndex);
        }
      }
      return;
    }

    if (!game.isDrawing) {
      return;
    }

    game.isDrawing = false;

    if (game.selectedTool === "eraser") {
      if (game.eraserPath.length > 1) {
        const eraserAction: Shape = {
          type: "eraser",
          cordinates: [...game.eraserPath],
        };
        game.sendShapeToServer(eraserAction);
      }
      game.eraserPath = [];
      game.redrawMainCanvas();
      return;
    }

    const endX = e.offsetX;
    const endY = e.offsetY;
    let newShape: Shape | null = null;

    switch (game.selectedTool) {
      case "rect": {
        const width = endX - game.startX;
        const height = endY - game.startY;
        if (Math.abs(width) > 2 && Math.abs(height) > 2) {
          newShape = { type: "rect", x: game.startX, y: game.startY, width, height };
        }
        break;
      }
      case "circle": {
        const radius = Math.hypot(endX - game.startX, endY - game.startY) / 2;
        if (radius > 1) {
          newShape = {
            type: "circle",
            centerX: (game.startX + endX) / 2,
            centerY: (game.startY + endY) / 2,
            radius,
          };
        }
        break;
      }
      case "line": {
        if (game.startX !== endX || game.startY !== endY) {
          newShape = { type: "line", startX: game.startX, startY: game.startY, endX, endY };
        }
        break;
      }
      case "arrow": {
        if (game.startX !== endX || game.startY !== endY) {
          newShape = { type: "arrow", startX: game.startX, startY: game.startY, endX, endY };
        }
        break;
      }
      case "diamond": {
        const diamondWidth = endX - game.startX;
        const diamondHeight = endY - game.startY;
        if (Math.abs(diamondWidth) > 2 && Math.abs(diamondHeight) > 2) {
          newShape = {
            type: "diamond",
            centerX: (game.startX + endX) / 2,
            centerY: (game.startY + endY) / 2,
            width: diamondWidth,
            height: diamondHeight,
          };
        }
        break;
      }
      case "ellipse": {
        const radiusX = Math.abs(endX - game.startX) / 2;
        const radiusY = Math.abs(endY - game.startY) / 2;
        if (radiusX > 1 && radiusY > 1) {
          newShape = {
            type: "ellipse",
            centerX: (game.startX + endX) / 2,
            centerY: (game.startY + endY) / 2,
            radiusX,
            radiusY,
          };
        }
        break;
      }
      case "parallelogram": {
        const paraWidth = endX - game.startX;
        const paraHeight = endY - game.startY;
        if (Math.abs(paraWidth) > 2 && Math.abs(paraHeight) > 2) {
          const skew = paraWidth * 0.2;
          newShape = {
            type: "parallelogram",
            x: game.startX,
            y: game.startY,
            width: paraWidth,
            height: paraHeight,
            skew,
          };
        }
        break;
      }
    }

    if (newShape) {
      game.existingShapes.push(newShape);
      game.redrawStaticShapes();
      game.sendShapeToServer(newShape);
    }

    game.redrawMainCanvas();
  };
}


