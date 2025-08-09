import { Tool } from "@/components/Canvas";
import { deleteShapesByIds, getExistingShapes } from "./http";

export type Shape =
  | { type: "rect"; x: number; y: number; width: number; height: number }
  | { type: "circle"; centerX: number; centerY: number; radius: number }
  | { type: "line"; startX: number; startY: number; endX: number; endY: number }
  | { type: "arrow"; startX: number; startY: number; endX: number; endY: number }
  | { type: "diamond"; centerX: number; centerY: number; width: number; height: number }
  | { type: "ellipse"; centerX: number; centerY: number; radiusX: number; radiusY: number }
  | { type: "parallelogram"; x: number; y: number; width: number; height: number; skew: number }
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
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(canvas: HTMLCanvasElement, roomId: string, socket: WebSocket) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false })!;
    this.roomId = roomId;
    this.socket = socket;

    console.log("Initializing Game constructor with roomId:", this.roomId);

    // Set up WebSocket handlers IMMEDIATELY before any async operations
    this.setupSocketHandlers();

    this.offscreen = document.createElement("canvas");
    this.offscreen.width = canvas.width;
    this.offscreen.height = canvas.height;
    this.offscreenCtx = this.offscreen.getContext("2d", { alpha: false })!;

    // Add canvas event listeners early
    this.addCanvasEventListeners();

    // Initialize asynchronously
    this.initialize().catch(error => {
      console.error("Failed to initialize Game:", error);
    });
  }

  public destroy() {
    console.log("Destroying Game instance");
    
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

  private async initialize() {
    console.log("Initializing Game with roomId:", this.roomId);
    
    try {
      // Set up basic canvas functionality first
      this.redrawStaticShapes();
      this.redrawMainCanvas();
      
      // Mark as initialized so user can start drawing immediately
      this.isInitialized = true;
      console.log("Game marked as initialized");
      
      // Join the room via WebSocket
      this.joinRoom();
      
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

  private joinRoom() {
    if (this.socket.readyState === WebSocket.OPEN) {
      console.log("Joining room:", this.roomId);
      this.socket.send(JSON.stringify({ 
        type: "join_room", 
        roomId: this.roomId,
        timestamp: Date.now()
      }));
    } else {
      console.warn("Cannot join room - WebSocket not open. ReadyState:", this.socket.readyState);
      // Try to rejoin after a delay if connection isn't ready
      setTimeout(() => {
        if (this.socket.readyState === WebSocket.OPEN) {
          this.joinRoom();
        }
      }, 1000);
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
    console.log("Redrawing static shapes:", this.existingShapes.length, "shapes");
    
    this.offscreenCtx.clearRect(
      0,
      0,
      this.offscreen.width,
      this.offscreen.height
    );
    
    this.existingShapes.forEach((shape, index) => {
      try {
        this.drawShape(this.offscreenCtx, shape);
      } catch (error) {
        console.error(`Error drawing shape at index ${index}:`, shape, error);
      }
    });
  }

  private redrawMainCanvas(overlayShape?: Shape, currentEraserPath?: Cordinate[]) {
    try {
      // Clear and redraw
      this.ctx.save();
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.drawImage(this.offscreen, 0, 0);

      if (overlayShape && overlayShape.type !== "eraser") {
        this.drawShape(this.ctx, overlayShape);
      }
      if (currentEraserPath && currentEraserPath.length > 1) {
        this.drawEraserPath(currentEraserPath);
      }
      
      this.ctx.restore();
      
      console.log("Main canvas redrawn with", this.existingShapes.length, "shapes");
    } catch (error) {
      console.error("Error redrawing main canvas:", error);
    }
  }

  private drawShape(ctx: CanvasRenderingContext2D, shape: Shape) {
    if (!ctx || !shape) {
      console.warn("Invalid context or shape for drawing:", { ctx: !!ctx, shape });
      return;
    }

    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255)";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    try {
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
          
        case "arrow":
          this.drawArrow(ctx, shape.startX, shape.startY, shape.endX, shape.endY);
          break;
          
        case "diamond":
          this.drawDiamond(ctx, shape.centerX, shape.centerY, shape.width, shape.height);
          break;
          
        case "ellipse":
          ctx.beginPath();
          ctx.ellipse(shape.centerX, shape.centerY, shape.radiusX, shape.radiusY, 0, 0, Math.PI * 2);
          ctx.stroke();
          break;
          
        case "parallelogram":
          this.drawParallelogram(ctx, shape.x, shape.y, shape.width, shape.height, shape.skew);
          break;
          
        default:
          console.warn("Unknown shape type:", shape);
      }
    } catch (error) {
      console.error("Error drawing individual shape:", shape, error);
    } finally {
      ctx.restore();
    }
  }

  private drawArrow(ctx: CanvasRenderingContext2D, startX: number, startY: number, endX: number, endY: number) {
    const headLength = 15; // Length of the arrow head
    const headAngle = Math.PI / 6; // Angle of the arrow head (30 degrees)
    
    // Draw the main line
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    
    // Calculate arrow head
    const angle = Math.atan2(endY - startY, endX - startX);
    
    // Draw arrow head
    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(
      endX - headLength * Math.cos(angle - headAngle),
      endY - headLength * Math.sin(angle - headAngle)
    );
    ctx.moveTo(endX, endY);
    ctx.lineTo(
      endX - headLength * Math.cos(angle + headAngle),
      endY - headLength * Math.sin(angle + headAngle)
    );
    ctx.stroke();
  }

  private drawDiamond(ctx: CanvasRenderingContext2D, centerX: number, centerY: number, width: number, height: number) {
    const halfWidth = Math.abs(width) / 2;
    const halfHeight = Math.abs(height) / 2;
    
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - halfHeight); // Top
    ctx.lineTo(centerX + halfWidth, centerY); // Right
    ctx.lineTo(centerX, centerY + halfHeight); // Bottom
    ctx.lineTo(centerX - halfWidth, centerY); // Left
    ctx.closePath();
    ctx.stroke();
  }

  private drawParallelogram(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, skew: number) {
    ctx.beginPath();
    ctx.moveTo(x + skew, y); // Top left (skewed)
    ctx.lineTo(x + width + skew, y); // Top right (skewed)
    ctx.lineTo(x + width, y + height); // Bottom right
    ctx.lineTo(x, y + height); // Bottom left
    ctx.closePath();
    ctx.stroke();
  }

  private drawEraserPath(path: Cordinate[]) {
    if (!path || path.length === 0) return;

    this.ctx.save();
    this.ctx.strokeStyle = "rgba(255,0,0,0.5)";
    this.ctx.lineWidth = 10;
    this.ctx.lineCap = "round";
    this.ctx.lineJoin = "round";
    this.ctx.beginPath();
    
    try {
      if (path.length > 0) {
        this.ctx.moveTo(path[0].x, path[0].y);
        for (let i = 1; i < path.length; i++) {
          this.ctx.lineTo(path[i].x, path[i].y);
        }
      }
      this.ctx.stroke();
    } catch (error) {
      console.error("Error drawing eraser path:", error);
    } finally {
      this.ctx.restore();
    }
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
      console.log("Erasing", this.existingShapes.length - shapesToKeep.length, "shapes");
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
        return this.isPointNearRect(pt, shape, tolerance);
      case "circle":
        const dist = Math.hypot(shape.centerX - pt.x, shape.centerY - pt.y);
        return Math.abs(dist - shape.radius) <= tolerance;
      case "line":
        return this.calculateDistanceToLine(pt, shape.startX, shape.startY, shape.endX, shape.endY) <= tolerance;
      case "arrow":
        return this.calculateDistanceToLine(pt, shape.startX, shape.startY, shape.endX, shape.endY) <= tolerance;
      case "diamond":
        return this.isPointNearDiamond(pt, shape, tolerance);
      case "ellipse":
        return this.isPointNearEllipse(pt, shape, tolerance);
      case "parallelogram":
        return this.isPointNearParallelogram(pt, shape, tolerance);
      default:
        return false;
    }
  }

  private isPointNearRect(pt: Cordinate, rect: { x: number; y: number; width: number; height: number }, tolerance: number): boolean {
    const outerX = rect.x - tolerance;
    const outerY = rect.y - tolerance;
    const outerW = rect.width + 2 * tolerance;
    const outerH = rect.height + 2 * tolerance;
    const innerX = rect.x + tolerance;
    const innerY = rect.y + tolerance;
    const innerW = rect.width - 2 * tolerance;
    const innerH = rect.height - 2 * tolerance;
    return (
      pt.x > outerX && pt.x < outerX + outerW &&
      pt.y > outerY && pt.y < outerY + outerH &&
      !(pt.x > innerX && pt.x < innerX + innerW && pt.y > innerY && pt.y < innerY + innerH)
    );
  }

  private isPointNearDiamond(pt: Cordinate, diamond: { centerX: number; centerY: number; width: number; height: number }, tolerance: number): boolean {
    // Simplified: check if point is near any of the diamond edges
    const halfW = Math.abs(diamond.width) / 2;
    const halfH = Math.abs(diamond.height) / 2;
    
    // Diamond vertices
    const top = { x: diamond.centerX, y: diamond.centerY - halfH };
    const right = { x: diamond.centerX + halfW, y: diamond.centerY };
    const bottom = { x: diamond.centerX, y: diamond.centerY + halfH };
    const left = { x: diamond.centerX - halfW, y: diamond.centerY };
    
    // Check distance to each edge
    return (
      this.calculateDistanceToLine(pt, top.x, top.y, right.x, right.y) <= tolerance ||
      this.calculateDistanceToLine(pt, right.x, right.y, bottom.x, bottom.y) <= tolerance ||
      this.calculateDistanceToLine(pt, bottom.x, bottom.y, left.x, left.y) <= tolerance ||
      this.calculateDistanceToLine(pt, left.x, left.y, top.x, top.y) <= tolerance
    );
  }

  private isPointNearEllipse(pt: Cordinate, ellipse: { centerX: number; centerY: number; radiusX: number; radiusY: number }, tolerance: number): boolean {
    // Approximate ellipse boundary check
    const dx = pt.x - ellipse.centerX;
    const dy = pt.y - ellipse.centerY;
    const normalizedDist = (dx * dx) / (ellipse.radiusX * ellipse.radiusX) + (dy * dy) / (ellipse.radiusY * ellipse.radiusY);
    return Math.abs(normalizedDist - 1) <= tolerance / Math.min(ellipse.radiusX, ellipse.radiusY);
  }

  private isPointNearParallelogram(pt: Cordinate, para: { x: number; y: number; width: number; height: number; skew: number }, tolerance: number): boolean {
    // Check distance to each edge of the parallelogram
    const topLeft = { x: para.x + para.skew, y: para.y };
    const topRight = { x: para.x + para.width + para.skew, y: para.y };
    const bottomRight = { x: para.x + para.width, y: para.y + para.height };
    const bottomLeft = { x: para.x, y: para.y + para.height };
    
    return (
      this.calculateDistanceToLine(pt, topLeft.x, topLeft.y, topRight.x, topRight.y) <= tolerance ||
      this.calculateDistanceToLine(pt, topRight.x, topRight.y, bottomRight.x, bottomRight.y) <= tolerance ||
      this.calculateDistanceToLine(pt, bottomRight.x, bottomRight.y, bottomLeft.x, bottomLeft.y) <= tolerance ||
      this.calculateDistanceToLine(pt, bottomLeft.x, bottomLeft.y, topLeft.x, topLeft.y) <= tolerance
    );
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
    console.log("Setting tool to:", tool);
    this.selectedTool = tool;
    this.isDrawing = false;
    this.eraserPath = [];
    this.redrawMainCanvas();
  }

  public getIsInitialized(): boolean {
    return this.isInitialized;
  }

  private setupSocketHandlers() {
    console.log("Setting up WebSocket handlers");

    this.socket.onopen = (event) => {
      console.log("WebSocket connection opened:", event);
      this.reconnectAttempts = 0; // Reset reconnect attempts on successful connection
      
      // Join room once connection is established
      this.joinRoom();
    };

    this.socket.onmessage = ({ data }) => {
      try {
        console.log("Raw WebSocket message received:", data);
        const message = JSON.parse(data);
        console.log("Parsed WebSocket message:", message);

        // Validate message structure
        if (!message || typeof message !== 'object') {
          console.warn("Invalid message format:", message);
          return;
        }

        // Ensure message is for this room (if roomId is included)
        if (message.roomId && message.roomId !== this.roomId) {
          console.log("Ignoring message for different room:", message.roomId, "expected:", this.roomId);
          return;
        }

        if (message.type === "draw" && message.shape) {
          const shape = message.shape;
          console.log("Processing draw message with shape:", shape);

          // Final validation
          if (!shape || typeof shape.type !== 'string') {
            console.warn("Received malformed shape data:", shape);
            return;
          }

          if (shape.type === "eraser") {
            console.log("Applying eraser action with", shape.cordinates?.length, "coordinates");
            if (Array.isArray(shape.cordinates)) {
              this.eraseShapes(shape.cordinates);
            } else {
              console.warn("Invalid eraser coordinates:", shape.cordinates);
            }
          } else {
            console.log("Adding shape to canvas:", shape.type);
            const initialCount = this.existingShapes.length;
            this.existingShapes.push(shape);
            console.log("Shapes count updated from", initialCount, "to", this.existingShapes.length);
            
            this.redrawStaticShapes();
            this.redrawMainCanvas();
            console.log("Canvas redrawn after receiving new shape");
          }
        } else if (message.type === "room_joined") {
          console.log("Successfully joined room:", message.roomId);
        } else if (message.type === "room_left") {
          console.log("Left room:", message.roomId);
        } else if (message.type === "user_joined" || message.type === "user_left") {
          console.log("User presence update:", message);
        } else {
          console.log("Received unhandled message type:", message.type, message);
        }
      } catch (error) {
        console.error("Error processing WebSocket message:", data, error);
      }
    };

    this.socket.onerror = (error) => {
      console.error("WebSocket error occurred:", error);
    };

    this.socket.onclose = (event) => {
      console.log("WebSocket connection closed:", event.code, event.reason);
      
      // Attempt to reconnect if not a normal closure
      if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
        console.log(`Attempting to reconnect... (${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
        this.reconnectAttempts++;
        
        setTimeout(() => {
          // Note: In a real implementation, you'd need to create a new WebSocket here
          // This would require the parent component to handle reconnection
          console.log("Reconnection logic would go here");
        }, this.reconnectDelay * this.reconnectAttempts);
      }
    };
  }

  private sendShapeToServer(shape: Shape) {
    if (this.socket.readyState === WebSocket.OPEN) {
      try {
        const message = {
          type: "draw",
          shape,
          roomId: this.roomId,
          timestamp: Date.now()
        };
        
        console.log("Sending shape to server:", message);
        this.socket.send(JSON.stringify(message));
      } catch (error) {
        console.error("Error sending shape to server:", error);
      }
    } else {
      console.warn("WebSocket not open. Cannot send shape to server. ReadyState:", this.socket.readyState);
      
      // Queue the message for later sending when connection is restored
      // In a production app, you might want to implement a message queue
    }
  }

  private addCanvasEventListeners() {
    console.log("Adding canvas event listeners");
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

    console.log("Mouse down - tool:", this.selectedTool, "coordinates:", e.offsetX, e.offsetY);
    
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
    
    console.log("Mouse up - tool:", this.selectedTool, "coordinates:", e.offsetX, e.offsetY);
    this.isDrawing = false;

    // Handle the eraser case first and exit the function immediately.
    if (this.selectedTool === 'eraser') {
      // If the user dragged the eraser, send the full path to other clients.
      if (this.eraserPath.length > 1) {
        const eraserAction: Shape = {
          type: "eraser",
          cordinates: [...this.eraserPath],
        };
        console.log("Sending eraser action to server with", this.eraserPath.length, "coordinates");
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

      case "arrow":
        if (this.startX !== endX || this.startY !== endY) {
          newShape = { type: "arrow", startX: this.startX, startY: this.startY, endX, endY };
        }
        break;

      case "diamond":
        const diamondWidth = endX - this.startX;
        const diamondHeight = endY - this.startY;
        if (Math.abs(diamondWidth) > 2 && Math.abs(diamondHeight) > 2) {
          newShape = {
            type: "diamond",
            centerX: (this.startX + endX) / 2,
            centerY: (this.startY + endY) / 2,
            width: diamondWidth,
            height: diamondHeight,
          };
        }
        break;

      case "ellipse":
        const radiusX = Math.abs(endX - this.startX) / 2;
        const radiusY = Math.abs(endY - this.startY) / 2;
        if (radiusX > 1 && radiusY > 1) {
          newShape = {
            type: "ellipse",
            centerX: (this.startX + endX) / 2,
            centerY: (this.startY + endY) / 2,
            radiusX,
            radiusY,
          };
        }
        break;

      case "parallelogram":
        const paraWidth = endX - this.startX;
        const paraHeight = endY - this.startY;
        if (Math.abs(paraWidth) > 2 && Math.abs(paraHeight) > 2) {
          const skew = paraWidth * 0.2; // 20% of width as skew
          newShape = {
            type: "parallelogram",
            x: this.startX,
            y: this.startY,
            width: paraWidth,
            height: paraHeight,
            skew,
          };
        }
        break;
    }

    // If a valid shape was created, add it to our state and broadcast it.
    if (newShape) {
      console.log("Created new shape:", newShape);
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
        case "arrow":
          overlayShape = this.createArrowOverlay(currX, currY);
          break;
        case "diamond":
          overlayShape = this.createDiamondOverlay(currX, currY);
          break;
        case "ellipse":
          overlayShape = this.createEllipseOverlay(currX, currY);
          break;
        case "parallelogram":
          overlayShape = this.createParallelogramOverlay(currX, currY);
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

  private createArrowOverlay(currX: number, currY: number): Shape {
    return {
      type: "arrow",
      startX: this.startX,
      startY: this.startY,
      endX: currX,
      endY: currY,
    };
  }

  private createDiamondOverlay(currX: number, currY: number): Shape {
    return {
      type: "diamond",
      centerX: (this.startX + currX) / 2,
      centerY: (this.startY + currY) / 2,
      width: currX - this.startX,
      height: currY - this.startY,
    };
  }

  private createEllipseOverlay(currX: number, currY: number): Shape {
    return {
      type: "ellipse",
      centerX: (this.startX + currX) / 2,
      centerY: (this.startY + currY) / 2,
      radiusX: Math.abs(currX - this.startX) / 2,
      radiusY: Math.abs(currY - this.startY) / 2,
    };
  }

  private createParallelogramOverlay(currX: number, currY: number): Shape {
    const width = currX - this.startX;
    const height = currY - this.startY;
    const skew = width * 0.2; // 20% of width as skew
    return {
      type: "parallelogram",
      x: this.startX,
      y: this.startY,
      width,
      height,
      skew,
    };
  }

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
    console.log("Manual sync requested");
    if (this.socket.readyState === WebSocket.OPEN) {
      this.joinRoom();
      this.retryLoadShapes();
    } else {
      console.warn("Cannot sync - WebSocket not open");
    }
  }
}