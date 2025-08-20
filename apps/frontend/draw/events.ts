import type { Game } from "./Game";
import { createMouseDownHandler } from "./events/mouseDown";
import { createMouseUpHandler } from "./events/mouseUp";
import { createMouseMoveHandler } from "./events/mouseMove";

export { createMouseDownHandler } from "./events/mouseDown";
export { createMouseUpHandler } from "./events/mouseUp";
export { createMouseMoveHandler } from "./events/mouseMove";

export function addCanvasEventListeners(game: Game) {
  game.mouseDownHandler = createMouseDownHandler(game);
  game.mouseUpHandler = createMouseUpHandler(game);
  game.mouseMoveHandler = createMouseMoveHandler(game);

  game.canvas.addEventListener("mousedown", game.mouseDownHandler);
  game.canvas.addEventListener("mouseup", game.mouseUpHandler);
  game.canvas.addEventListener("mousemove", game.mouseMoveHandler);
  game.canvas.addEventListener("mouseleave", game.mouseUpHandler);
}


