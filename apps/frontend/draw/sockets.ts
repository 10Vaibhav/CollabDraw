import type { Game } from "./Game";
import { joinRoom } from "./lifecycle";
import { shapesEqual } from "./shapeUtils";

export function setupSocketHandlers(game: Game) {
  game.socket.onopen = () => {
    game.reconnectAttempts = 0;
    joinRoom(game);
  };

  game.socket.onmessage = ({ data }) => {
    try {
      const message = JSON.parse(data);
      if (!message || typeof message !== "object") return;
      if (message.roomId && message.roomId !== game.roomId) return;

      if (message.type === "draw" && message.shape) {
        const shape = message.shape;
        if (!shape || typeof shape.type !== "string") return;

        if (shape.type === "eraser") {
          if (Array.isArray(shape.cordinates)) {
            game.eraseShapes(shape.cordinates);
          }
        } else {
          game.existingShapes.push(shape);
          game.redrawStaticShapes();
          game.redrawMainCanvas();
        }
      } else if (
        message.type === "realtime_update" &&
        typeof message.shapeId === "number" &&
        message.update
      ) {
        const shapeIndex = game.existingShapes.findIndex((s) => s.id === message.shapeId);
        if (shapeIndex !== -1) {
          const targetShape = game.existingShapes[shapeIndex] as any;
          Object.assign(targetShape, message.update);
          game.redrawStaticShapes();
          game.redrawMainCanvas();
        }
      } else if (
        message.type === "update" &&
        typeof message.shapeId === "number" &&
        message.update
      ) {
        const shapeIndex = game.existingShapes.findIndex((s) => s.id === message.shapeId);
        if (shapeIndex !== -1) {
          const targetShape = game.existingShapes[shapeIndex] as any;
          Object.assign(targetShape, message.update);
          game.redrawStaticShapes();
          game.redrawMainCanvas();
        }
      } else if (message.type === "shape_created" && message.dbId && message.tempShape) {
        for (let i = game.existingShapes.length - 1; i >= 0; i--) {
          const shape = game.existingShapes[i];
          if (!shape.id && shapesEqual(shape, message.tempShape)) {
            (shape as any).id = message.dbId;
            break;
          }
        }
      }
    } catch (error) {
      console.error("Error processing WebSocket message:", data, error);
    }
  };

  game.socket.onerror = (error) => {
    console.error("WebSocket error occurred:", error);
  };

  game.socket.onclose = (event) => {
    if (event.code !== 1000 && game.reconnectAttempts < game.maxReconnectAttempts) {
      game.reconnectAttempts++;
      setTimeout(() => {
        // In a real implementation, create a new WebSocket here via parent component
      }, game.reconnectDelay * game.reconnectAttempts);
    }
  };
}

export function sendShapeToServer(game: Game, shape: any) {
  if (game.socket.readyState === WebSocket.OPEN) {
    try {
      const message = {
        type: "draw",
        shape,
        roomId: game.roomId,
        timestamp: Date.now(),
      };
      game.socket.send(JSON.stringify(message));
    } catch (error) {
      console.error("Error sending shape to server:", error);
    }
  }
}


