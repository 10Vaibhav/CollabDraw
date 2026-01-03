import type { Game } from "../Game";

// Convert touch event to mouse-like coordinates
function getTouchCoordinates(touch: Touch, canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect();
  return {
    offsetX: touch.clientX - rect.left,
    offsetY: touch.clientY - rect.top
  };
}

// Create a synthetic mouse event from touch
function createSyntheticMouseEvent(
  type: 'mousedown' | 'mousemove' | 'mouseup',
  touch: Touch,
  canvas: HTMLCanvasElement
): MouseEvent {
  const coords = getTouchCoordinates(touch, canvas);
  
  return new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: touch.clientX,
    clientY: touch.clientY,
    // Add offsetX and offsetY properties
    ...coords
  }) as MouseEvent & { offsetX: number; offsetY: number };
}

export function addTouchEventListeners(game: Game) {
  let lastTouchTime = 0;
  let touchStarted = false;

  const handleTouchStart = (e: TouchEvent) => {
    e.preventDefault(); // Prevent scrolling and zooming
    
    if (e.touches.length === 1) { // Only handle single touch
      touchStarted = true;
      const touch = e.touches[0];
      const syntheticEvent = createSyntheticMouseEvent('mousedown', touch, game.canvas);
      
      // Add the coordinates directly to the event object
      (syntheticEvent as any).offsetX = getTouchCoordinates(touch, game.canvas).offsetX;
      (syntheticEvent as any).offsetY = getTouchCoordinates(touch, game.canvas).offsetY;
      
      game.mouseDownHandler(syntheticEvent);
      lastTouchTime = Date.now();
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    e.preventDefault(); // Prevent scrolling
    
    if (e.touches.length === 1 && touchStarted) {
      const touch = e.touches[0];
      const syntheticEvent = createSyntheticMouseEvent('mousemove', touch, game.canvas);
      
      // Add the coordinates directly to the event object
      (syntheticEvent as any).offsetX = getTouchCoordinates(touch, game.canvas).offsetX;
      (syntheticEvent as any).offsetY = getTouchCoordinates(touch, game.canvas).offsetY;
      
      game.mouseMoveHandler(syntheticEvent);
    }
  };

  const handleTouchEnd = (e: TouchEvent) => {
    e.preventDefault();
    
    if (touchStarted) {
      touchStarted = false;
      
      // Use the last known touch position or center of canvas
      const touch = e.changedTouches[0] || e.touches[0];
      let syntheticEvent: MouseEvent;
      
      if (touch) {
        syntheticEvent = createSyntheticMouseEvent('mouseup', touch, game.canvas);
        (syntheticEvent as any).offsetX = getTouchCoordinates(touch, game.canvas).offsetX;
        (syntheticEvent as any).offsetY = getTouchCoordinates(touch, game.canvas).offsetY;
      } else {
        // Fallback if no touch info available
        syntheticEvent = new MouseEvent('mouseup', {
          bubbles: true,
          cancelable: true
        });
        (syntheticEvent as any).offsetX = 0;
        (syntheticEvent as any).offsetY = 0;
      }
      
      game.mouseUpHandler(syntheticEvent);
    }
  };

  const handleTouchCancel = (e: TouchEvent) => {
    e.preventDefault();
    touchStarted = false;
    
    // Treat as touch end
    handleTouchEnd(e);
  };

  // Add touch event listeners
  game.canvas.addEventListener("touchstart", handleTouchStart, { passive: false });
  game.canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
  game.canvas.addEventListener("touchend", handleTouchEnd, { passive: false });
  game.canvas.addEventListener("touchcancel", handleTouchCancel, { passive: false });

  // Store references for cleanup
  (game as any).touchStartHandler = handleTouchStart;
  (game as any).touchMoveHandler = handleTouchMove;
  (game as any).touchEndHandler = handleTouchEnd;
  (game as any).touchCancelHandler = handleTouchCancel;
}

export function removeTouchEventListeners(game: Game) {
  if ((game as any).touchStartHandler) {
    game.canvas.removeEventListener("touchstart", (game as any).touchStartHandler);
    game.canvas.removeEventListener("touchmove", (game as any).touchMoveHandler);
    game.canvas.removeEventListener("touchend", (game as any).touchEndHandler);
    game.canvas.removeEventListener("touchcancel", (game as any).touchCancelHandler);
  }
}