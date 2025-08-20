import { Tool } from "@/components/Canvas";
import { deleteShapesByIds } from "./http";
import { Shape, Cordinate, ResizeHandle } from "./types";
import { redrawStaticShapes as renderStaticShapes, redrawMainCanvas as renderMainCanvas } from "./engine/CanvasRenderer";
import { ShapeSync } from "./sync";
import { eraseShapesLocal } from "./eraser";
import { initializeGame, retryLoadShapes as retryLoadShapesFn, joinRoom } from "./lifecycle";
import { addCanvasEventListeners } from "./events";
import { setupSocketHandlers } from "./sockets";

export class Game {
  public canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private offscreen: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;
  public existingShapes: (Shape & { id?: number })[] = [];
  public roomId: string;
  public socket: WebSocket;
  public selectedTool: Tool = "select";
  public eraserPath: Cordinate[] = [];
  
  // Drawing state
  public isDrawing = false;
  public startX = 0;
  public startY = 0;
  
  // Selection and dragging state
  public selectedShapeIndex: number | null = null;
  public isDragging = false;
  public isResizing = false;
  public resizeHandle: ResizeHandle = null;
  // Note: drag offsets are computed on the fly; no persistent fields needed
  public lastMouseX = 0;
  public lastMouseY = 0;
  public resizeStartBounds: any = null;
  public sync: ShapeSync;
  
  // General state
  public isInitialized = false;
  public reconnectAttempts = 0;
  public maxReconnectAttempts = 5;
  public reconnectDelay = 1000;

  // Event handler references are assigned by events module
  public mouseDownHandler!: (e: MouseEvent) => void;
  public mouseUpHandler!: (e: MouseEvent) => void;
  public mouseMoveHandler!: (e: MouseEvent) => void;

  constructor(canvas: HTMLCanvasElement, roomId: string, socket: WebSocket) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false })!;
    this.roomId = roomId;
    this.socket = socket;

    // Set up WebSocket handlers before any async operations
    setupSocketHandlers(this);

    this.offscreen = document.createElement("canvas");
    this.offscreen.width = canvas.width;
    this.offscreen.height = canvas.height;
    this.offscreenCtx = this.offscreen.getContext("2d", { alpha: false })!;

    // Sync helper
    this.sync = new ShapeSync(this.socket, this.roomId, () => this.existingShapes);

    // Add canvas event listeners early
    addCanvasEventListeners(this);

    // Initialize asynchronously
    initializeGame(this).catch(error => {
      console.error("Failed to initialize Game:", error);
    });
  }

  public destroy() {
    this.canvas.removeEventListener("mousedown", this.mouseDownHandler);
    this.canvas.removeEventListener("mouseup", this.mouseUpHandler);
    this.canvas.removeEventListener("mousemove", this.mouseMoveHandler);
    this.canvas.removeEventListener("mouseleave", this.mouseUpHandler);

    if (this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(
        JSON.stringify({ type: "leave_room", roomId: this.roomId })
      );
    }

    // Clean up socket handlers
    this.socket.onmessage = null;
    this.socket.onopen = null;
    this.socket.onerror = null;
    this.socket.onclose = null;
  }

  // Public method to retry loading shapes if needed
  public async retryLoadShapes() {
    await retryLoadShapesFn(this);
  }

  public redrawStaticShapes() {
    renderStaticShapes(this.offscreenCtx, this.offscreen, this.existingShapes, this.selectedShapeIndex);
  }

  public redrawMainCanvas(overlayShape?: Shape, currentEraserPath?: Cordinate[]) {
    try {
      renderMainCanvas(
        this.ctx,
        this.offscreen,
        this.existingShapes,
        this.selectedTool,
        this.selectedShapeIndex,
        overlayShape,
        currentEraserPath
      );
    } catch (error) {
      console.error("Error redrawing main canvas:", error);
    }
  }

  // Sync helpers moved to sync.ts

  // Resizing helpers moved to resize module

  // Drawing helpers moved to drawUtils

  // Selection helpers moved to selection.ts

  // Move helpers moved to selection.ts

  // Database sync moved to sync.ts

  public async eraseShapes(points: Cordinate[]) {
    const { kept, deletedIds, erased } = eraseShapesLocal(this.existingShapes, points, 15);
    if (erased) {
      this.existingShapes = kept;
      if (this.selectedShapeIndex !== null && this.selectedShapeIndex >= this.existingShapes.length) {
        this.selectedShapeIndex = null;
      }
      this.redrawStaticShapes();
      this.redrawMainCanvas(undefined, this.selectedTool === "eraser" ? this.eraserPath : undefined);
    }
    if (deletedIds.length > 0) {
      try {
        await deleteShapesByIds(deletedIds);
      } catch (error) {
        console.error("Failed to delete shapes on server:", error);
        try {
          await this.retryLoadShapes();
        } catch (syncError) {
          console.error("Failed to re-sync with server:", syncError);
        }
      }
    }
  }

  // Eraser helpers moved to eraser.ts

  // Geometry helpers moved to geometry module

  public setTool(tool: Tool) {
    this.selectedTool = tool;
    this.isDrawing = false;
    this.isDragging = false;
    this.isResizing = false;
    this.eraserPath = [];
    
    // Clear selection when switching away from select tool
    if (tool !== "select") {
      this.selectedShapeIndex = null;
      this.redrawStaticShapes();
    }
    
    this.redrawMainCanvas();
  }

  public getIsInitialized(): boolean {
    return this.isInitialized;
  }

  // Send shape to server
  public sendShapeToServer(shape: Shape) {
    if (this.socket.readyState === WebSocket.OPEN) {
      try {
        const message = {
          type: "draw",
          shape,
          roomId: this.roomId,
          timestamp: Date.now()
        };
        this.socket.send(JSON.stringify(message));
      } catch (error) {
        console.error("Error sending shape to server:", error);
      }
    }
  }

  // Overlay creators moved to overlays module

  // Public method to get connection status
  public getConnectionStatus(): string {
    switch (this.socket.readyState) {
      case WebSocket.CONNECTING:
        return "connecting";
      case WebSocket.OPEN:
        return "open";
      case WebSocket.CLOSING:
        return "closing";
      case WebSocket.CLOSED:
        return "closed";
      default:
        return "unknown";
    }
  }

  // Public method to manually trigger reconnection logic
  public requestSync() {
    if (this.socket.readyState === WebSocket.OPEN) {
      joinRoom(this);
      this.retryLoadShapes();
    }
  }
}