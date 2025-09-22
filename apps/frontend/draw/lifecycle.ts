import type { Game } from "./Game";
import { getExistingShapes } from "./http";

export async function initializeGame(game: Game) {
  try {
    // Set up basic canvas functionality first
    game.redrawStaticShapes();
    game.redrawMainCanvas();

    // Mark as initialized so user can start drawing immediately
    game.isInitialized = true;

    // Join the room via WebSocket
    joinRoom(game);

    // Try to load existing shapes in the background
    await loadExistingShapes(game);
  } catch (error) {
    console.error("Error during initialization:", error);
    // Even if loading shapes fails, ensure the app is still usable
    game.isInitialized = true;
    game.redrawStaticShapes();
    game.redrawMainCanvas();
  }
}

export function joinRoom(game: Game) {
  if (game.socket.readyState === WebSocket.OPEN) {
    game.socket.send(
      JSON.stringify({ type: "join_room", roomId: game.roomId, timestamp: Date.now() })
    );
  } else {
    // Try to rejoin after a delay if connection isn't ready
    setTimeout(() => {
      if (game.socket.readyState === WebSocket.OPEN) {
        joinRoom(game);
      }
    }, 1000);
  }
}

export async function loadExistingShapes(game: Game) {
  try {
    // Validate and convert roomId
    const documentId = Number(game.roomId);
    if (isNaN(documentId) || documentId <= 0) {
      console.warn("Invalid document ID for loading shapes:", documentId);
      return;
    }

    console.log("Loading existing shapes for document:", documentId);
    const shapes = await getExistingShapes(documentId);

    if (Array.isArray(shapes) && shapes.length > 0) {
      console.log(`Successfully loaded ${shapes.length} shapes`);
      game.existingShapes = shapes as any;
      // Redraw canvas with loaded shapes
      game.redrawStaticShapes();
      game.redrawMainCanvas();
    } else {
      console.log("No existing shapes found or empty array returned");
    }
  } catch (error) {
    console.error("Failed to load existing shapes:", error);
    // Ensure we have an empty array
    game.existingShapes = [] as any;
  }
}

export async function retryLoadShapes(game: Game) {
  await loadExistingShapes(game);
}


