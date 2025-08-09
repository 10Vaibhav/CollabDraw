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

type ResizeHandle = "nw" | "ne" | "sw" | "se" | "n" | "s" | "e" | "w" | null;

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private offscreen: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;
  private existingShapes: (Shape & { id?: number })[] = [];
  private roomId: string;
  private socket: WebSocket;
  private selectedTool: Tool = "select";
  private eraserPath: Cordinate[] = [];
  
  // Drawing state
  private isDrawing = false;
  private startX = 0;
  private startY = 0;
  
  // Selection and dragging state
  private selectedShapeIndex: number | null = null;
  private isDragging = false;
  private isResizing = false;
  private resizeHandle: ResizeHandle = null;
  private dragOffsetX = 0;
  private dragOffsetY = 0;
  private lastMouseX = 0;
  private lastMouseY = 0;
  private resizeStartBounds: any = null;
  
  // Real-time throttling - CRITICAL FIX
  private realtimeUpdateThrottle = 50; // 50ms throttle for smooth updates
  private lastRealtimeUpdateSent = 0;
  
  // General state
  private isInitialized = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(canvas: HTMLCanvasElement, roomId: string, socket: WebSocket) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false })!;
    this.roomId = roomId;
    this.socket = socket;

    console.log("🎯 Initializing Game constructor with roomId:", this.roomId);

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
    console.log("🧹 Destroying Game instance");
    
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
    console.log("🚀 Initializing Game with roomId:", this.roomId);
    
    try {
      // Set up basic canvas functionality first
      this.redrawStaticShapes();
      this.redrawMainCanvas();
      
      // Mark as initialized so user can start drawing immediately
      this.isInitialized = true;
      console.log("✅ Game marked as initialized");
      
      // Join the room via WebSocket
      this.joinRoom();
      
      // Try to load existing shapes in the background
      await this.loadExistingShapes();
      
    } catch (error) {
      console.error("❌ Error during initialization:", error);
      // Even if loading shapes fails, ensure the app is still usable
      this.isInitialized = true;
      this.redrawStaticShapes();
      this.redrawMainCanvas();
    }
  }

  private joinRoom() {
    if (this.socket.readyState === WebSocket.OPEN) {
      console.log("🚪 Joining room:", this.roomId);
      this.socket.send(JSON.stringify({ 
        type: "join_room", 
        roomId: this.roomId,
        timestamp: Date.now()
      }));
    } else {
      console.warn("⚠️ Cannot join room - WebSocket not open. ReadyState:", this.socket.readyState);
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
      console.log("📥 Loading existing shapes for room:", this.roomId);
      
      // Validate and convert roomId
      const documentId = Number(this.roomId);
      if (isNaN(documentId) || documentId <= 0) {
        console.warn("⚠️ Invalid room ID for loading shapes:", this.roomId);
        return;
      }

      const shapes = await getExistingShapes(documentId);
      
      if (Array.isArray(shapes)) {
        this.existingShapes = shapes;
        console.log("✅ Successfully loaded", shapes.length, "existing shapes");
        
        // Redraw canvas with loaded shapes
        this.redrawStaticShapes();
        this.redrawMainCanvas();
      } else {
        console.warn("⚠️ Invalid shapes data received:", shapes);
      }
      
    } catch (error) {
      console.error("❌ Failed to load existing shapes:", error);
      
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
    console.log("🔄 Retrying to load shapes...");
    await this.loadExistingShapes();
  }

  private redrawStaticShapes() {
    console.log("🎨 Redrawing static shapes:", this.existingShapes.length, "shapes");
    
    this.offscreenCtx.clearRect(
      0,
      0,
      this.offscreen.width,
      this.offscreen.height
    );
    
    this.existingShapes.forEach((shape, index) => {
      try {
        // Highlight selected shape
        const isSelected = this.selectedShapeIndex === index;
        this.drawShape(this.offscreenCtx, shape, isSelected);
      } catch (error) {
        console.error(`❌ Error drawing shape at index ${index}:`, shape, error);
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

      // Draw resize handles for selected shape
      if (this.selectedShapeIndex !== null && this.selectedTool === "select") {
        this.drawResizeHandles(this.ctx, this.existingShapes[this.selectedShapeIndex]);
      }
      
      this.ctx.restore();
      
    } catch (error) {
      console.error("❌ Error redrawing main canvas:", error);
    }
  }

  private drawShape(ctx: CanvasRenderingContext2D, shape: Shape, isSelected: boolean = false) {
    if (!ctx || !shape) {
      console.warn("⚠️ Invalid context or shape for drawing:", { ctx: !!ctx, shape });
      return;
    }

    ctx.save();
    
    // Use different colors for selected vs normal shapes
    if (isSelected) {
      ctx.strokeStyle = "#00ff00"; // Green for selected
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 5]); // Dashed line for selected
    } else {
      ctx.strokeStyle = "rgba(255,255,255)";
      ctx.lineWidth = 2;
      ctx.setLineDash([]); // Solid line for normal
    }
    
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
          console.warn("⚠️ Unknown shape type:", shape);
      }
    } catch (error) {
      console.error("❌ Error drawing individual shape:", shape, error);
    } finally {
      ctx.restore();
    }
  }

  // Draw resize handles around selected shape
  private drawResizeHandles(ctx: CanvasRenderingContext2D, shape: Shape) {
    if (!shape) return;

    const handleSize = 8;
    const bounds = this.getShapeBounds(shape);
    
    if (!bounds) return;

    ctx.save();
    ctx.fillStyle = "#00ff00";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;

    // Calculate handle positions
    const handles = [
      { x: bounds.x - handleSize/2, y: bounds.y - handleSize/2, handle: "nw" }, // Top-left
      { x: bounds.x + bounds.width - handleSize/2, y: bounds.y - handleSize/2, handle: "ne" }, // Top-right
      { x: bounds.x - handleSize/2, y: bounds.y + bounds.height - handleSize/2, handle: "sw" }, // Bottom-left
      { x: bounds.x + bounds.width - handleSize/2, y: bounds.y + bounds.height - handleSize/2, handle: "se" }, // Bottom-right
      { x: bounds.x + bounds.width/2 - handleSize/2, y: bounds.y - handleSize/2, handle: "n" }, // Top-center
      { x: bounds.x + bounds.width/2 - handleSize/2, y: bounds.y + bounds.height - handleSize/2, handle: "s" }, // Bottom-center
      { x: bounds.x - handleSize/2, y: bounds.y + bounds.height/2 - handleSize/2, handle: "w" }, // Left-center
      { x: bounds.x + bounds.width - handleSize/2, y: bounds.y + bounds.height/2 - handleSize/2, handle: "e" }, // Right-center
    ];

    // Draw handles
    handles.forEach(handle => {
      ctx.fillRect(handle.x, handle.y, handleSize, handleSize);
      ctx.strokeRect(handle.x, handle.y, handleSize, handleSize);
    });

    ctx.restore();
  }

  // Get bounding box for any shape type
  private getShapeBounds(shape: Shape): { x: number; y: number; width: number; height: number } | null {
    switch (shape.type) {
      case "rect":
        return { x: shape.x, y: shape.y, width: shape.width, height: shape.height };
      
      case "circle":
        return { 
          x: shape.centerX - shape.radius, 
          y: shape.centerY - shape.radius, 
          width: shape.radius * 2, 
          height: shape.radius * 2 
        };
      
      case "line":
      case "arrow":
        const minX = Math.min(shape.startX, shape.endX);
        const minY = Math.min(shape.startY, shape.endY);
        const maxX = Math.max(shape.startX, shape.endX);
        const maxY = Math.max(shape.startY, shape.endY);
        return { 
          x: minX, 
          y: minY, 
          width: maxX - minX || 10, 
          height: maxY - minY || 10 
        };
      
      case "diamond":
        const halfW = Math.abs(shape.width) / 2;
        const halfH = Math.abs(shape.height) / 2;
        return { 
          x: shape.centerX - halfW, 
          y: shape.centerY - halfH, 
          width: Math.abs(shape.width), 
          height: Math.abs(shape.height) 
        };
      
      case "ellipse":
        return { 
          x: shape.centerX - shape.radiusX, 
          y: shape.centerY - shape.radiusY, 
          width: shape.radiusX * 2, 
          height: shape.radiusY * 2 
        };
      
      case "parallelogram":
        return { x: shape.x, y: shape.y, width: shape.width, height: shape.height };
      
      default:
        return null;
    }
  }

  // Check if point is over a resize handle
  private getResizeHandle(x: number, y: number, shape: Shape): ResizeHandle {
    if (!shape) return null;

    const bounds = this.getShapeBounds(shape);
    if (!bounds) return null;

    const handleSize = 8;
    const tolerance = 4;

    // Handle positions
    const handles = [
      { x: bounds.x - handleSize/2, y: bounds.y - handleSize/2, handle: "nw" as ResizeHandle },
      { x: bounds.x + bounds.width - handleSize/2, y: bounds.y - handleSize/2, handle: "ne" as ResizeHandle },
      { x: bounds.x - handleSize/2, y: bounds.y + bounds.height - handleSize/2, handle: "sw" as ResizeHandle },
      { x: bounds.x + bounds.width - handleSize/2, y: bounds.y + bounds.height - handleSize/2, handle: "se" as ResizeHandle },
      { x: bounds.x + bounds.width/2 - handleSize/2, y: bounds.y - handleSize/2, handle: "n" as ResizeHandle },
      { x: bounds.x + bounds.width/2 - handleSize/2, y: bounds.y + bounds.height - handleSize/2, handle: "s" as ResizeHandle },
      { x: bounds.x - handleSize/2, y: bounds.y + bounds.height/2 - handleSize/2, handle: "w" as ResizeHandle },
      { x: bounds.x + bounds.width - handleSize/2, y: bounds.y + bounds.height/2 - handleSize/2, handle: "e" as ResizeHandle },
    ];

    for (const handle of handles) {
      if (x >= handle.x - tolerance && x <= handle.x + handleSize + tolerance &&
          y >= handle.y - tolerance && y <= handle.y + handleSize + tolerance) {
        return handle.handle;
      }
    }

    return null;
  }

  // CRITICAL FIX: Resize shape and send real-time updates
  private resizeShape(shapeIndex: number, handle: ResizeHandle, deltaX: number, deltaY: number) {
    const shape = this.existingShapes[shapeIndex] as any;
    const originalBounds = this.resizeStartBounds;
    
    if (!originalBounds) return;

    switch (shape.type) {
      case "rect":
      case "parallelogram":
        this.resizeRectangularShape(shape, handle, deltaX, deltaY, originalBounds);
        break;
        
      case "circle":
        this.resizeCircle(shape, handle, deltaX, deltaY, originalBounds);
        break;
        
      case "diamond":
        this.resizeDiamond(shape, handle, deltaX, deltaY, originalBounds);
        break;
        
      case "ellipse":
        this.resizeEllipse(shape, handle, deltaX, deltaY, originalBounds);
        break;
        
      case "line":
      case "arrow":
        this.resizeLine(shape, handle, deltaX, deltaY, originalBounds);
        break;
    }

    // CRITICAL FIX: Send real-time updates during resize
    this.sendRealtimeUpdateToServer(shapeIndex);
  }

  // CRITICAL FIX: Send throttled real-time updates (NO database save)
  private sendRealtimeUpdateToServer(shapeIndex: number) {
    const now = Date.now();
    if (now - this.lastRealtimeUpdateSent < this.realtimeUpdateThrottle) {
      return; // Skip this update to avoid spamming
    }
    
    this.lastRealtimeUpdateSent = now;
    
    const shape = this.existingShapes[shapeIndex];
    
    // Can only send updates for shapes that have been saved to DB
    if (!shape.id) {
      console.log("⚠️ Shape has no ID, cannot send real-time update");
      return;
    }

    if (this.socket.readyState !== WebSocket.OPEN) {
      console.log("⚠️ WebSocket not open, cannot send real-time update");
      return;
    }

    // Get the update fields for this shape type
    const updateFields = this.getShapeUpdateFields(shape);
    
    const payload = {
      type: "realtime_update", // CRITICAL: Real-time message type
      roomId: this.roomId,
      shapeId: shape.id,
      shapeType: shape.type,
      update: updateFields
    };

    console.log("✨ Sending REAL-TIME update:", payload.shapeId, payload.update);
    this.socket.send(JSON.stringify(payload));
  }

  // CRITICAL FIX: Get update fields for any shape type
  private getShapeUpdateFields(shape: Shape & { id?: number }): Record<string, any> {
    switch (shape.type) {
      case "rect":
        return { x: shape.x, y: shape.y, width: shape.width, height: shape.height };
      case "circle":
        return { centerX: shape.centerX, centerY: shape.centerY, radius: shape.radius };
      case "line":
      case "arrow":
        return { startX: shape.startX, startY: shape.startY, endX: shape.endX, endY: shape.endY };
      case "diamond":
        return { centerX: shape.centerX, centerY: shape.centerY, width: shape.width, height: shape.height };
      case "ellipse":
        return { centerX: shape.centerX, centerY: shape.centerY, radiusX: shape.radiusX, radiusY: shape.radiusY };
      case "parallelogram":
        return { x: shape.x, y: shape.y, width: shape.width, height: shape.height, skew: shape.skew };
      default:
        return {};
    }
  }

  private resizeRectangularShape(shape: any, handle: ResizeHandle, deltaX: number, deltaY: number, originalBounds: any) {
    const newBounds = { ...originalBounds };
    
    // Apply resize based on handle
    switch (handle) {
      case "nw":
        newBounds.x += deltaX;
        newBounds.y += deltaY;
        newBounds.width -= deltaX;
        newBounds.height -= deltaY;
        break;
      case "ne":
        newBounds.y += deltaY;
        newBounds.width += deltaX;
        newBounds.height -= deltaY;
        break;
      case "sw":
        newBounds.x += deltaX;
        newBounds.width -= deltaX;
        newBounds.height += deltaY;
        break;
      case "se":
        newBounds.width += deltaX;
        newBounds.height += deltaY;
        break;
      case "n":
        newBounds.y += deltaY;
        newBounds.height -= deltaY;
        break;
      case "s":
        newBounds.height += deltaY;
        break;
      case "w":
        newBounds.x += deltaX;
        newBounds.width -= deltaX;
        break;
      case "e":
        newBounds.width += deltaX;
        break;
    }

    // Minimum size constraint
    if (Math.abs(newBounds.width) < 10) newBounds.width = Math.sign(newBounds.width) * 10 || 10;
    if (Math.abs(newBounds.height) < 10) newBounds.height = Math.sign(newBounds.height) * 10 || 10;

    shape.x = newBounds.x;
    shape.y = newBounds.y;
    shape.width = newBounds.width;
    shape.height = newBounds.height;
  }

  private resizeCircle(shape: any, handle: ResizeHandle, deltaX: number, deltaY: number, originalBounds: any) {
    // For circles, resize based on distance from center
    let newRadius = originalBounds.width / 2;
    
    // Calculate new radius based on handle movement
    switch (handle) {
      case "e":
      case "w":
        newRadius = Math.abs(originalBounds.width / 2 + (handle === "e" ? deltaX : -deltaX));
        break;
      case "n":
      case "s":
        newRadius = Math.abs(originalBounds.height / 2 + (handle === "s" ? deltaY : -deltaY));
        break;
      case "ne":
      case "nw":
      case "se":
      case "sw":
        const avgDelta = (Math.abs(deltaX) + Math.abs(deltaY)) / 2;
        newRadius = Math.abs(originalBounds.width / 2 + avgDelta);
        break;
    }

    // Minimum radius constraint
    if (newRadius < 5) newRadius = 5;

    shape.radius = newRadius;
  }

  private resizeDiamond(shape: any, handle: ResizeHandle, deltaX: number, deltaY: number, originalBounds: any) {
    let newWidth = originalBounds.width;
    let newHeight = originalBounds.height;
    
    // Apply resize based on handle
    switch (handle) {
      case "e":
      case "w":
        newWidth = Math.abs(originalBounds.width + (handle === "e" ? deltaX * 2 : -deltaX * 2));
        break;
      case "n":
      case "s":
        newHeight = Math.abs(originalBounds.height + (handle === "s" ? deltaY * 2 : -deltaY * 2));
        break;
      case "ne":
      case "nw":
      case "se":
      case "sw":
        newWidth = Math.abs(originalBounds.width + deltaX * 2);
        newHeight = Math.abs(originalBounds.height + deltaY * 2);
        break;
    }

    // Minimum size constraint
    if (newWidth < 10) newWidth = 10;
    if (newHeight < 10) newHeight = 10;

    shape.width = newWidth * Math.sign(originalBounds.width);
    shape.height = newHeight * Math.sign(originalBounds.height);
  }

  private resizeEllipse(shape: any, handle: ResizeHandle, deltaX: number, deltaY: number, originalBounds: any) {
    let newRadiusX = originalBounds.width / 2;
    let newRadiusY = originalBounds.height / 2;
    
    // Apply resize based on handle
    switch (handle) {
      case "e":
      case "w":
        newRadiusX = Math.abs(originalBounds.width / 2 + (handle === "e" ? deltaX : -deltaX));
        break;
      case "n":
      case "s":
        newRadiusY = Math.abs(originalBounds.height / 2 + (handle === "s" ? deltaY : -deltaY));
        break;
      case "ne":
      case "nw":
      case "se":
      case "sw":
        newRadiusX = Math.abs(originalBounds.width / 2 + deltaX);
        newRadiusY = Math.abs(originalBounds.height / 2 + deltaY);
        break;
    }

    // Minimum size constraint
    if (newRadiusX < 5) newRadiusX = 5;
    if (newRadiusY < 5) newRadiusY = 5;

    shape.radiusX = newRadiusX;
    shape.radiusY = newRadiusY;
  }

  private resizeLine(shape: any, handle: ResizeHandle, deltaX: number, deltaY: number, originalBounds: any) {
    // For lines, resize by moving endpoints
    const originalStartX = originalBounds.startX || Math.min(shape.startX, shape.endX);
    const originalStartY = originalBounds.startY || Math.min(shape.startY, shape.endY);
    const originalEndX = originalBounds.endX || Math.max(shape.startX, shape.endX);
    const originalEndY = originalBounds.endY || Math.max(shape.startY, shape.endY);

    // Determine which endpoint to move based on handle
    switch (handle) {
      case "nw":
      case "n":
      case "w":
        shape.startX = originalStartX + deltaX;
        shape.startY = originalStartY + deltaY;
        break;
      case "ne":
      case "e":
        shape.endX = originalEndX + deltaX;
        shape.startY = originalStartY + deltaY;
        break;
      case "sw":
      case "s":
        shape.startX = originalStartX + deltaX;
        shape.endY = originalEndY + deltaY;
        break;
      case "se":
        shape.endX = originalEndX + deltaX;
        shape.endY = originalEndY + deltaY;
        break;
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
      console.error("❌ Error drawing eraser path:", error);
    } finally {
      this.ctx.restore();
    }
  }

  // Shape selection logic
  private findShapeAtPoint(x: number, y: number): number | null {
    // Check shapes in reverse order (top to bottom)
    for (let i = this.existingShapes.length - 1; i >= 0; i--) {
      if (this.isPointInsideShape(this.existingShapes[i], x, y)) {
        return i;
      }
    }
    return null;
  }

  private isPointInsideShape(shape: Shape, x: number, y: number): boolean {
    const tolerance = 10; // Pixels for hit detection
    
    switch (shape.type) {
      case "rect":
        return x >= shape.x - tolerance && 
               x <= shape.x + shape.width + tolerance && 
               y >= shape.y - tolerance && 
               y <= shape.y + shape.height + tolerance;
      
      case "circle":
        const distFromCenter = Math.hypot(x - shape.centerX, y - shape.centerY);
        return distFromCenter <= shape.radius + tolerance;
      
      case "line":
      case "arrow":
        return this.calculateDistanceToLine({ x, y }, shape.startX, shape.startY, shape.endX, shape.endY) <= tolerance;
      
      case "diamond":
        return this.isPointNearDiamond({ x, y }, shape, tolerance);
      
      case "ellipse":
        return this.isPointNearEllipse({ x, y }, shape, tolerance);
      
      case "parallelogram":
        return this.isPointNearParallelogram({ x, y }, shape, tolerance);
      
      default:
        return false;
    }
  }

  // Move shape by delta - updates the shape in place
  private moveShapeBy(shapeIndex: number, deltaX: number, deltaY: number) {
    const shape = this.existingShapes[shapeIndex] as any;
    
    switch (shape.type) {
      case "rect":
      case "parallelogram":
        shape.x += deltaX;
        shape.y += deltaY;
        break;
      
      case "circle":
      case "diamond":
      case "ellipse":
        shape.centerX += deltaX;
        shape.centerY += deltaY;
        break;
      
      case "line":
      case "arrow":
        shape.startX += deltaX;
        shape.startY += deltaY;
        shape.endX += deltaX;
        shape.endY += deltaY;
        break;
    }

    // SEND REAL-TIME UPDATES DURING DRAGGING TOO
    this.sendRealtimeUpdateToServer(shapeIndex);
  }

  // Send shape change to server (for database persistence on mouse up)
  private sendShapeUpdateToServer(shapeIndex: number) {
    const shape = this.existingShapes[shapeIndex];
    
    // Can only persist changes for shapes that have been saved to DB
    if (!shape.id) {
      console.warn("⚠️ Cannot update shape without database ID");
      return;
    }

    if (this.socket.readyState !== WebSocket.OPEN) {
      console.warn("⚠️ WebSocket not open, cannot send update");
      return;
    }

    const updateFields = this.getShapeUpdateFields(shape);
    
    const payload = {
      type: "update", // This saves to database
      roomId: this.roomId,
      shapeId: shape.id,
      shapeType: shape.type,
      update: updateFields
    };

    console.log("💾 Sending DATABASE update:", payload.shapeId, payload.update);
    this.socket.send(JSON.stringify(payload));
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
      console.log("🧹 Erasing", this.existingShapes.length - shapesToKeep.length, "shapes");
      this.existingShapes = shapesToKeep;
      // Clear selection if selected shape was erased
      if (this.selectedShapeIndex !== null && this.selectedShapeIndex >= this.existingShapes.length) {
        this.selectedShapeIndex = null;
      }
      this.redrawStaticShapes();
      this.redrawMainCanvas(undefined, this.selectedTool === "eraser" ? this.eraserPath : undefined);
    }

    if (idsToAttemptDeletion.length > 0) {
      try {
        await deleteShapesByIds(idsToAttemptDeletion);
        console.log("✅ Successfully deleted shapes with IDs:", idsToAttemptDeletion);
      } catch (error) {
        console.error("❌ Failed to delete shapes on server:", error);
        
        // Show user-friendly error message
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.warn(`Deletion failed: ${errorMessage}. Re-syncing with server...`);
        
        // Re-sync with server
        try {
          await this.loadExistingShapes();
        } catch (syncError) {
          console.error("❌ Failed to re-sync with server:", syncError);
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
    console.log("🛠️ Setting tool to:", tool);
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

  // CRITICAL FIX: WebSocket message handling
  private setupSocketHandlers() {
    console.log("🔗 Setting up WebSocket handlers");

    this.socket.onopen = (event) => {
      console.log("✅ WebSocket connection opened:", event);
      this.reconnectAttempts = 0; // Reset reconnect attempts on successful connection
      
      // Join room once connection is established
      this.joinRoom();
    };

    // CRITICAL FIX: Proper message handling for real-time updates
    this.socket.onmessage = ({ data }) => {
      try {
        const message = JSON.parse(data);
        console.log("📨 Received WebSocket message:", message.type, message.shapeId);

        // Validate message structure
        if (!message || typeof message !== 'object') {
          console.warn("⚠️ Invalid message format:", message);
          return;
        }

        // Ensure message is for this room (if roomId is included)
        if (message.roomId && message.roomId !== this.roomId) {
          console.log("🚫 Ignoring message for different room:", message.roomId, "expected:", this.roomId);
          return;
        }

        if (message.type === "draw" && message.shape) {
          const shape = message.shape;
          console.log("🎨 Processing draw message with shape:", shape.type);

          // Final validation
          if (!shape || typeof shape.type !== 'string') {
            console.warn("⚠️ Received malformed shape data:", shape);
            return;
          }

          if (shape.type === "eraser") {
            console.log("🧹 Applying eraser action with", shape.cordinates?.length, "coordinates");
            if (Array.isArray(shape.cordinates)) {
              this.eraseShapes(shape.cordinates);
            } else {
              console.warn("⚠️ Invalid eraser coordinates:", shape.cordinates);
            }
          } else {
            console.log("✏️ Adding shape to canvas:", shape.type);
            const initialCount = this.existingShapes.length;
            this.existingShapes.push(shape);
            console.log(`📊 Shapes count updated from ${initialCount} to ${this.existingShapes.length}`);
            
            this.redrawStaticShapes();
            this.redrawMainCanvas();
            console.log("✅ Canvas redrawn after receiving new shape");
          }
        } 
        // CRITICAL FIX: Handle real-time updates IMMEDIATELY
        else if (message.type === "realtime_update" && typeof message.shapeId === "number" && message.update) {
          console.log("⚡ Processing REAL-TIME update from other user:", message.shapeId, message.update);
          
          const shapeIndex = this.existingShapes.findIndex(s => s.id === message.shapeId);
          if (shapeIndex !== -1) {
            const targetShape = this.existingShapes[shapeIndex] as any;
            
            // IMMEDIATE update application - NO DELAY
            Object.assign(targetShape, message.update);
            
            // IMMEDIATE redraw - INSTANT visual feedback
            this.redrawStaticShapes();
            this.redrawMainCanvas();
            
            console.log("🔥 REAL-TIME update applied INSTANTLY:", message.shapeId);
          } else {
            console.warn("⚠️ Could not find shape with id for real-time update:", message.shapeId);
          }
        } 
        // Handle final database updates
        else if (message.type === "update" && typeof message.shapeId === "number" && message.update) {
          console.log("💾 Processing DATABASE update from other user:", message.shapeId, message.update);
          
          const shapeIndex = this.existingShapes.findIndex(s => s.id === message.shapeId);
          if (shapeIndex !== -1) {
            const targetShape = this.existingShapes[shapeIndex] as any;
            
            // Apply the final database update
            Object.assign(targetShape, message.update);
            
            // Redraw to show the final state
            this.redrawStaticShapes();
            this.redrawMainCanvas();
            
            console.log("✅ DATABASE update applied:", message.shapeId);
          } else {
            console.warn("⚠️ Could not find shape with id for database update:", message.shapeId);
          }
        } else if (message.type === "shape_created" && message.dbId && message.tempShape) {
          // Handle newly created shape getting its database ID
          console.log("🆔 Received database ID for created shape:", message.dbId);
          
          // Find the shape in our local array and assign its database ID
          for (let i = this.existingShapes.length - 1; i >= 0; i--) {
            const shape = this.existingShapes[i];
            if (!shape.id && this.shapesEqual(shape, message.tempShape)) {
              shape.id = message.dbId;
              console.log("✅ Assigned database ID", message.dbId, "to shape at index", i);
              break;
            }
          }
        } else if (message.type === "joined_room") {
          console.log("🚪 Successfully joined room:", message.roomId);
        } else if (message.type === "left_room") {
          console.log("👋 Left room:", message.roomId);
        } else if (message.type === "user_joined" || message.type === "user_left") {
          console.log("👥 User presence update:", message);
        } else {
          console.log("❓ Received unhandled message type:", message.type);
        }
      } catch (error) {
        console.error("❌ Error processing WebSocket message:", data, error);
      }
    };

    this.socket.onerror = (error) => {
      console.error("❌ WebSocket error occurred:", error);
    };

    this.socket.onclose = (event) => {
      console.log("📡 WebSocket connection closed:", event.code, event.reason);
      
      // Attempt to reconnect if not a normal closure
      if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
        console.log(`🔄 Attempting to reconnect... (${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
        this.reconnectAttempts++;
        
        setTimeout(() => {
          // Note: In a real implementation, you'd need to create a new WebSocket here
          // This would require the parent component to handle reconnection
          console.log("🔄 Reconnection logic would go here");
        }, this.reconnectDelay * this.reconnectAttempts);
      }
    };
  }

  // Helper method to compare shapes for ID assignment
  private shapesEqual(shape1: Shape, shape2: Shape): boolean {
    if (shape1.type !== shape2.type) return false;
    
    switch (shape1.type) {
      case "rect":
        return shape1.x === shape2.x && shape1.y === shape2.y && 
               shape1.width === shape2.width && shape1.height === shape2.height;
      case "circle":
        return shape1.centerX === shape2.centerX && shape1.centerY === shape2.centerY &&
               shape1.radius === shape2.radius;
      case "line":
      case "arrow":
        return shape1.startX === shape2.startX && shape1.startY === shape2.startY &&
               shape1.endX === shape2.endX && shape1.endY === shape2.endY;
      case "diamond":
        return shape1.centerX === shape2.centerX && shape1.centerY === shape2.centerY &&
               shape1.width === shape2.width && shape1.height === shape2.height;
      case "ellipse":
        return shape1.centerX === shape2.centerX && shape1.centerY === shape2.centerY &&
               shape1.radiusX === shape2.radiusX && shape1.radiusY === shape2.radiusY;
      case "parallelogram":
        return shape1.x === shape2.x && shape1.y === shape2.y &&
               shape1.width === shape2.width && shape1.height === shape2.height &&
               shape1.skew === shape2.skew;
      default:
        return false;
    }
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
        
        console.log("📤 Sending shape to server:", message.shape.type);
        this.socket.send(JSON.stringify(message));
      } catch (error) {
        console.error("❌ Error sending shape to server:", error);
      }
    } else {
      console.warn("⚠️ WebSocket not open. Cannot send shape to server. ReadyState:", this.socket.readyState);
    }
  }

  private addCanvasEventListeners() {
    console.log("🖱️ Adding canvas event listeners");
    this.canvas.addEventListener("mousedown", this.mouseDownHandler);
    this.canvas.addEventListener("mouseup", this.mouseUpHandler);
    this.canvas.addEventListener("mousemove", this.mouseMoveHandler);
    this.canvas.addEventListener("mouseleave", this.mouseUpHandler);
  }

  private mouseDownHandler = (e: MouseEvent) => {
    // Don't allow drawing until initialized
    if (!this.isInitialized) {
      console.log("⏳ Game not yet initialized, please wait...");
      return;
    }

    console.log("🖱️ Mouse down - tool:", this.selectedTool, "coordinates:", e.offsetX, e.offsetY);
    
    const mouseX = e.offsetX;
    const mouseY = e.offsetY;
    
    if (this.selectedTool === "select") {
      // Selection/dragging/resizing mode
      const hitShapeIndex = this.findShapeAtPoint(mouseX, mouseY);
      
      if (hitShapeIndex !== null) {
        this.selectedShapeIndex = hitShapeIndex;
        const shape = this.existingShapes[hitShapeIndex];
        
        // Check if clicking on a resize handle
        const handle = this.getResizeHandle(mouseX, mouseY, shape);
        
        if (handle) {
          // Start resizing
          this.isResizing = true;
          this.resizeHandle = handle;
          this.resizeStartBounds = this.getShapeProps(shape);
          this.lastMouseX = mouseX;
          this.lastMouseY = mouseY;
          console.log("🔧 Started resizing shape with handle:", handle);
        } else {
          // Start dragging
          this.isDragging = true;
          this.lastMouseX = mouseX;
          this.lastMouseY = mouseY;
          console.log("👆 Started dragging shape at index:", hitShapeIndex);
        }
        
        // Redraw to show selection
        this.redrawStaticShapes();
        this.redrawMainCanvas();
      } else {
        // Clicked on empty space, clear selection
        this.selectedShapeIndex = null;
        this.redrawStaticShapes();
        this.redrawMainCanvas();
      }
    } else if (this.selectedTool === "eraser") {
      // Eraser mode
      this.isDrawing = true;
      this.eraserPath = [{ x: mouseX, y: mouseY }];
      this.eraseShapes(this.eraserPath);
    } else {
      // Drawing mode
      this.isDrawing = true;
      this.startX = mouseX;
      this.startY = mouseY;
    }
  };

  // Get shape properties for resize operation
  private getShapeProps(shape: Shape): any {
    const bounds = this.getShapeBounds(shape);
    const props = { ...bounds };
    
    // Add shape-specific properties only for line and arrow
    if (shape.type === "line" || shape.type === "arrow") {
      Object.assign(props, {
        startX: shape.startX,
        startY: shape.startY,
        endX: shape.endX,
        endY: shape.endY
      });
    }
    
    return props;
  }

  private mouseUpHandler = (e: MouseEvent) => {
    if (!this.isInitialized) {
      return;
    }
    
    console.log("🖱️ Mouse up - tool:", this.selectedTool, "coordinates:", e.offsetX, e.offsetY);

    if (this.selectedTool === "select") {
      if (this.isDragging) {
        // Finish dragging and send final update to server for database persistence
        this.isDragging = false;
        if (this.selectedShapeIndex !== null) {
          this.sendShapeUpdateToServer(this.selectedShapeIndex);
        }
        console.log("✅ Finished dragging shape, sent final update to server");
      } else if (this.isResizing) {
        // CRITICAL FIX: Finish resizing and send final update
        this.isResizing = false;
        this.resizeHandle = null;
        this.resizeStartBounds = null;
        if (this.selectedShapeIndex !== null) {
          this.sendShapeUpdateToServer(this.selectedShapeIndex);
        }
        console.log("✅ Finished resizing shape, sent FINAL update to server");
      }
      return;
    }

    if (!this.isDrawing) {
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
        console.log("🧹 Sending eraser action to server with", this.eraserPath.length, "coordinates");
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
      console.log("✨ Created new shape:", newShape.type);
      this.existingShapes.push(newShape);
      this.redrawStaticShapes(); // Add the final shape to the offscreen canvas.
      this.sendShapeToServer(newShape);
    }

    // Redraw the main canvas one last time to clear any temporary drawing overlays.
    this.redrawMainCanvas();
  };

  // CRITICAL FIX: Mousemove handler with proper real-time updates
  private mouseMoveHandler = (e: MouseEvent) => {
    if (!this.isInitialized) return;
    
    const currX = e.offsetX;
    const currY = e.offsetY;

    if (this.selectedTool === "select") {
      if (this.isDragging && this.selectedShapeIndex !== null) {
        // Handle dragging
        const deltaX = currX - this.lastMouseX;
        const deltaY = currY - this.lastMouseY;
        
        this.moveShapeBy(this.selectedShapeIndex, deltaX, deltaY);
        
        this.lastMouseX = currX;
        this.lastMouseY = currY;
        
        // Redraw immediately for smooth dragging
        this.redrawStaticShapes();
        this.redrawMainCanvas();
        
        return;
      } 
      // CRITICAL FIX: Resizing with real-time updates
      else if (this.isResizing && this.selectedShapeIndex !== null && this.resizeHandle) {
        const deltaX = currX - this.lastMouseX;
        const deltaY = currY - this.lastMouseY;
        
        // Apply resize changes locally FIRST
        this.resizeShape(this.selectedShapeIndex, this.resizeHandle, deltaX, deltaY);
        
        // Redraw immediately for smooth local visual feedback
        this.redrawStaticShapes();
        this.redrawMainCanvas();
        
        console.log("🔥 Resizing live - real-time updates sending...");
        return;
      } else {
        // Update cursor based on what's under the mouse
        if (this.selectedShapeIndex !== null) {
          const shape = this.existingShapes[this.selectedShapeIndex];
          const handle = this.getResizeHandle(currX, currY, shape);
          
          if (handle) {
            // Set resize cursor based on handle
            const cursors: Record<string, string> = {
              'nw': 'nw-resize',
              'ne': 'ne-resize',
              'sw': 'sw-resize',
              'se': 'se-resize',
              'n': 'n-resize',
              's': 's-resize',
              'e': 'e-resize',
              'w': 'w-resize'
            };
            this.canvas.style.cursor = cursors[handle] || 'pointer';
          } else if (this.isPointInsideShape(shape, currX, currY)) {
            this.canvas.style.cursor = 'move';
          } else {
            this.canvas.style.cursor = 'default';
          }
        } else {
          this.canvas.style.cursor = 'default';
        }
      }
    } else {
      // Reset cursor for other tools
      this.canvas.style.cursor = 'crosshair';
    }

    if (!this.isDrawing) return;

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
    console.log("🔄 Manual sync requested");
    if (this.socket.readyState === WebSocket.OPEN) {
      this.joinRoom();
      this.retryLoadShapes();
    } else {
      console.warn("⚠️ Cannot sync - WebSocket not open");
    }
  }
}