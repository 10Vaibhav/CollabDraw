import { Tool } from "@/components/Canvas"; // Assuming this path is correct
import { deleteShapesByIds, getExistingShapes } from "./http"; // Assuming these functions exist and work

export type Shape =
  | { type: "rect"; x: number; y: number; width: number; height: number }
  | { type: "circle"; centerX: number; centerY: number; radius: number }
  | { type: "line"; startX: number; startY: number; endX: number; endY: number }
  | { type: "eraser"; cordinates: Cordinate[] };

interface Cordinate {
  x: number;
  y: number;
}

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private offscreen: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;
  private existingShapes: (Shape & { id?: number })[] = [];
  private roomId: string;
  private socket: WebSocket;
  private selectedTool: Tool = "circle";
  private eraserPath: Cordinate[] = [];
  private isDrawing = false;
  private startX = 0;
  private startY = 0;
  private isInitialized = false;

  constructor(canvas: HTMLCanvasElement, roomId: string, socket: WebSocket) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false })!;
    this.roomId = roomId;
    this.socket = socket;

    this.offscreen = document.createElement("canvas");
    this.offscreen.width = canvas.width;
    this.offscreen.height = canvas.height;
    this.offscreenCtx = this.offscreen.getContext("2d", { alpha: false })!;

    // Initialize asynchronously
    this.initialize().catch(error => {
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
  }

  private async initialize() {
    console.log("Initializing Game with roomId:", this.roomId);
    
    try {
      // Set up basic canvas functionality first
      this.setupSocketHandlers();
      this.addCanvasEventListeners();
      this.redrawStaticShapes();
      this.redrawMainCanvas();
      
      // Mark as initialized so user can start drawing immediately
      this.isInitialized = true;
      
      // Try to load existing shapes in the background
      await this.loadExistingShapes();
      
    } catch (error) {
      console.error("Error during initialization:", error);
      // Even if loading shapes fails, ensure the app is still usable
      this.isInitialized = true;
      this.redrawStaticShapes();
      this.redrawMainCanvas();
    }
  }

  private async loadExistingShapes() {
    try {
      console.log("Loading existing shapes for room:", this.roomId);
      
      // Validate and convert roomId
      const documentId = Number(this.roomId);
      if (isNaN(documentId) || documentId <= 0) {
        console.warn("Invalid room ID for loading shapes:", this.roomId);
        return;
      }

      const shapes = await getExistingShapes(documentId);
      
      if (Array.isArray(shapes)) {
        this.existingShapes = shapes;
        console.log("Successfully loaded", shapes.length, "existing shapes");
        
        // Redraw canvas with loaded shapes
        this.redrawStaticShapes();
        this.redrawMainCanvas();
      } else {
        console.warn("Invalid shapes data received:", shapes);
      }
      
    } catch (error) {
      console.error("Failed to load existing shapes:", error);
      
      // Show user-friendly message but don't break the app
      if (error instanceof Error) {
        console.warn(`Canvas started without existing shapes: ${error.message}`);
      }
      
      // Ensure we have an empty array
      this.existingShapes = [];
    }
  }

  // Public method to retry loading shapes if needed
  public async retryLoadShapes() {
    console.log("Retrying to load shapes...");
    await this.loadExistingShapes();
  }

  private redrawStaticShapes() {
    this.offscreenCtx.clearRect(
      0,
      0,
      this.offscreen.width,
      this.offscreen.height
    );
    this.existingShapes.forEach((shape) =>
      this.drawShape(this.offscreenCtx, shape)
    );
  }

  private redrawMainCanvas(overlayShape?: Shape, currentEraserPath?: Cordinate[]) {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.drawImage(this.offscreen, 0, 0);

    if (overlayShape && overlayShape.type !== "eraser") {
      this.drawShape(this.ctx, overlayShape);
    }
    if (currentEraserPath && currentEraserPath.length > 1) {
      this.drawEraserPath(currentEraserPath);
    }
  }

  private drawShape(ctx: CanvasRenderingContext2D, shape: Shape) {
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255)";
    ctx.lineWidth = 1;

    switch (shape.type) {
      case "rect":
        ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
        break;
      case "circle":
        ctx.beginPath();
        ctx.arc(shape.centerX, shape.centerY, shape.radius, 0, Math.PI * 2);
        ctx.stroke();
        break;
      case "line":
        ctx.beginPath();
        ctx.moveTo(shape.startX, shape.startY);
        ctx.lineTo(shape.endX, shape.endY);
        ctx.stroke();
        break;
    }
    ctx.restore();
  }

  private drawEraserPath(path: Cordinate[]) {
    this.ctx.save();
    this.ctx.strokeStyle = "rgba(255,0,0,0.5)";
    this.ctx.lineWidth = 10;
    this.ctx.lineCap = "round";
    this.ctx.lineJoin = "round";
    this.ctx.beginPath();
    if (path.length > 0) {
      this.ctx.moveTo(path[0].x, path[0].y);
      for (let i = 1; i < path.length; i++) {
        this.ctx.lineTo(path[i].x, path[i].y);
      }
    }
    this.ctx.stroke();
    this.ctx.restore();
  }

  private async eraseShapes(points: Cordinate[]) {
    const eraseTolerance = 15;
    const idsToAttemptDeletion: number[] = [];
    const shapesToKeep: (Shape & { id?: number })[] = [];
    let shapesWereErased = false;

    this.existingShapes.forEach((shape) => {
      const isErased = points.some((pt) =>
        this.isShapeErased(shape, pt, eraseTolerance)
      );

      if (isErased) {
        if (shape.id !== undefined) {
          idsToAttemptDeletion.push(shape.id);
        }
        shapesWereErased = true;
      } else {
        shapesToKeep.push(shape);
      }
    });

    if (shapesWereErased) {
      this.existingShapes = shapesToKeep;
      this.redrawStaticShapes();
      this.redrawMainCanvas(undefined, this.selectedTool === "eraser" ? this.eraserPath : undefined);
    }

    if (idsToAttemptDeletion.length > 0) {
      try {
        await deleteShapesByIds(idsToAttemptDeletion);
        console.log("Successfully deleted shapes with IDs:", idsToAttemptDeletion);
      } catch (error) {
        console.error("Failed to delete shapes on server:", error);
        
        // Show user-friendly error message
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.warn(`Deletion failed: ${errorMessage}. Re-syncing with server...`);
        
        // Re-sync with server
        try {
          await this.loadExistingShapes();
        } catch (syncError) {
          console.error("Failed to re-sync with server:", syncError);
          // Continue with local state - at least the app keeps working
        }
      }
    }
  }

  private isShapeErased(shape: Shape, pt: Cordinate, tolerance: number): boolean {
    switch (shape.type) {
      case "rect":
        const outerX = shape.x - tolerance;
        const outerY = shape.y - tolerance;
        const outerW = shape.width + 2 * tolerance;
        const outerH = shape.height + 2 * tolerance;
        const innerX = shape.x + tolerance;
        const innerY = shape.y + tolerance;
        const innerW = shape.width - 2 * tolerance;
        const innerH = shape.height - 2 * tolerance;
        return (
          pt.x > outerX && pt.x < outerX + outerW &&
          pt.y > outerY && pt.y < outerY + outerH &&
          !(pt.x > innerX && pt.x < innerX + innerW && pt.y > innerY && pt.y < innerY + innerH)
        );
      case "circle":
        const dist = Math.hypot(shape.centerX - pt.x, shape.centerY - pt.y);
        return Math.abs(dist - shape.radius) <= tolerance;
      case "line":
        return (
          this.calculateDistanceToLine(pt, shape.startX, shape.startY, shape.endX, shape.endY) <= tolerance
        );
      default:
        return false;
    }
  }

  private calculateDistanceToLine(pt: Cordinate, x1: number, y1: number, x2: number, y2: number): number {
    const A = pt.x - x1;
    const B = pt.y - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    if (lenSq !== 0) {
      param = dot / lenSq;
    }
    let xx, yy;
    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }
    return Math.hypot(pt.x - xx, pt.y - yy);
  }

  public setTool(tool: Tool) {
    this.selectedTool = tool;
    this.isDrawing = false;
    this.eraserPath = [];
    this.redrawMainCanvas();
  }

  public getIsInitialized(): boolean {
    return this.isInitialized;
  }

  private setupSocketHandlers() {
    this.socket.onmessage = ({ data }) => {
      try {
        const message = JSON.parse(data);

        if (message.type === "draw" && message.shape) {
          const shape = message.shape;

          // Final validation
          if (typeof shape.type !== 'string') {
            console.warn("Received malformed shape data:", shape);
            return;
          }

          if (shape.type === "eraser") {
            this.eraseShapes(shape.cordinates);
          } else {
            this.existingShapes.push(shape);
            this.redrawStaticShapes();
            this.redrawMainCanvas();
          }
        } else {
          // console.log("Received non-draw message or message without shape:", message);
        }
      } catch (error) {
        console.error("Error processing WebSocket message:", data, error);
      }
    };

    this.socket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    this.socket.onclose = (event) => {
      console.log("WebSocket closed:", event.code, event.reason);
    };
  }

  private sendShapeToServer(shape: Shape) {
    if (this.socket.readyState === WebSocket.OPEN) {
      try {
        this.socket.send(
          JSON.stringify({ type: "draw", shape, roomId: this.roomId })
        );
      } catch (error) {
        console.error("Error sending shape to server:", error);
      }
    } else {
      console.warn("WebSocket not open. Cannot send shape to server. ReadyState:", this.socket.readyState);
    }
  }

  private addCanvasEventListeners() {
    this.canvas.addEventListener("mousedown", this.mouseDownHandler);
    this.canvas.addEventListener("mouseup", this.mouseUpHandler);
    this.canvas.addEventListener("mousemove", this.mouseMoveHandler);
    this.canvas.addEventListener("mouseleave", this.mouseUpHandler);
  }

  private mouseDownHandler = (e: MouseEvent) => {
    // Don't allow drawing until initialized
    if (!this.isInitialized) {
      console.log("Game not yet initialized, please wait...");
      return;
    }

    this.isDrawing = true;
    this.startX = e.offsetX;
    this.startY = e.offsetY;
    
    if (this.selectedTool === "eraser") {
      this.eraserPath = [{ x: e.offsetX, y: e.offsetY }];
      this.eraseShapes(this.eraserPath);
    }
  };

  private mouseUpHandler = (e: MouseEvent) => {
    if (!this.isDrawing || !this.isInitialized) {
      return;
    }
    this.isDrawing = false;

    // Handle the eraser case first and exit the function immediately.
    if (this.selectedTool === 'eraser') {
      // If the user dragged the eraser, send the full path to other clients.
      if (this.eraserPath.length > 1) {
        const eraserAction: Shape = {
          type: "eraser",
          cordinates: [...this.eraserPath],
        };
        this.sendShapeToServer(eraserAction);
      }
      // Clean up the local eraser path state.
      this.eraserPath = [];
      // Redraw the canvas to remove the temporary red eraser line.
      this.redrawMainCanvas();
      // Crucially, exit the function so no shape-drawing code can possibly run.
      return;
    }

    // --- If we reach this point, the tool is NOT the eraser. ---

    const endX = e.offsetX;
    const endY = e.offsetY;
    let newShape: Shape | null = null;

    // Handle all shape-drawing tools.
    switch (this.selectedTool) {
      case "rect":
        const width = endX - this.startX;
        const height = endY - this.startY;
        if (Math.abs(width) > 2 && Math.abs(height) > 2) {
          newShape = { type: "rect", x: this.startX, y: this.startY, width, height };
        }
        break;

      case "circle":
        const radius = Math.hypot(endX - this.startX, endY - this.startY) / 2;
        if (radius > 1) {
          newShape = {
            type: "circle",
            centerX: (this.startX + endX) / 2,
            centerY: (this.startY + endY) / 2,
            radius,
          };
        }
        break;

      case "line":
        if (this.startX !== endX || this.startY !== endY) {
          newShape = { type: "line", startX: this.startX, startY: this.startY, endX, endY };
        }
        break;
    }

    // If a valid shape was created, add it to our state and broadcast it.
    if (newShape) {
      this.existingShapes.push(newShape);
      this.redrawStaticShapes(); // Add the final shape to the offscreen canvas.
      this.sendShapeToServer(newShape);
    }

    // Redraw the main canvas one last time to clear any temporary drawing overlays.
    this.redrawMainCanvas();
  };

  private mouseMoveHandler = (e: MouseEvent) => {
    if (!this.isDrawing || !this.isInitialized) return;
    
    const currX = e.offsetX;
    const currY = e.offsetY;

    if (this.selectedTool === "eraser") {
      this.eraserPath.push({ x: currX, y: currY });
      this.eraseShapes(this.eraserPath);
      this.redrawMainCanvas(undefined, this.eraserPath);
    } else {
      let overlayShape: Shape | undefined;
      switch (this.selectedTool) {
        case "rect":
          overlayShape = this.createRectOverlay(currX, currY);
          break;
        case "circle":
          overlayShape = this.createCircleOverlay(currX, currY);
          break;
        case "line":
          overlayShape = this.createLineOverlay(currX, currY);
          break;
      }
      this.redrawMainCanvas(overlayShape);
    }
  };

  private createRectOverlay(currX: number, currY: number): Shape {
    return {
      type: "rect",
      x: this.startX,
      y: this.startY,
      width: currX - this.startX,
      height: currY - this.startY,
    };
  }

  private createCircleOverlay(currX: number, currY: number): Shape {
    const radius = Math.hypot(currX - this.startX, currY - this.startY) / 2;
    return {
      type: "circle",
      centerX: (this.startX + currX) / 2,
      centerY: (this.startY + currY) / 2,
      radius,
    };
  }

  private createLineOverlay(currX: number, currY: number): Shape {
    return {
      type: "line",
      startX: this.startX,
      startY: this.startY,
      endX: currX,
      endY: currY,
    };
  }
}