import type { Game } from "./Game";
import { createMouseDownHandler } from "./events/mouseDown";
import { createMouseUpHandler } from "./events/mouseUp";
import { createMouseMoveHandler } from "./events/mouseMove";
import { addTouchEventListeners, removeTouchEventListeners } from "./events/touchEvents";

export { createMouseDownHandler } from "./events/mouseDown";
export { createMouseUpHandler } from "./events/mouseUp";
export { createMouseMoveHandler } from "./events/mouseMove";

export function addCanvasEventListeners(game: Game) {
  game.mouseDownHandler = createMouseDownHandler(game);
  game.mouseUpHandler = createMouseUpHandler(game);
  game.mouseMoveHandler = createMouseMoveHandler(game);

  // Add mouse event listeners
  game.canvas.addEventListener("mousedown", game.mouseDownHandler);
  game.canvas.addEventListener("mouseup", game.mouseUpHandler);
  game.canvas.addEventListener("mousemove", game.mouseMoveHandler);
  game.canvas.addEventListener("mouseleave", game.mouseUpHandler);

  // Add touch event listeners for mobile support
  addTouchEventListeners(game);
}

export function removeCanvasEventListeners(game: Game) {
  // Remove mouse event listeners
  game.canvas.removeEventListener("mousedown", game.mouseDownHandler);
  game.canvas.removeEventListener("mouseup", game.mouseUpHandler);
  game.canvas.removeEventListener("mousemove", game.mouseMoveHandler);
  game.canvas.removeEventListener("mouseleave", game.mouseUpHandler);

  // Remove touch event listeners
  removeTouchEventListeners(game);
}