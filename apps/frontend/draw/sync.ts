import { Shape } from "./types";

type ShapesAccessor = () => (Shape & { id?: number })[];

export class ShapeSync {
  private socket: WebSocket;
  private roomId: string;
  private getShapes: ShapesAccessor;
  private realtimeUpdateThrottle = 50;
  private lastRealtimeUpdateSent = 0;

  constructor(socket: WebSocket, roomId: string, getShapes: ShapesAccessor) {
    this.socket = socket;
    this.roomId = roomId;
    this.getShapes = getShapes;
  }

  public sendRealtimeUpdate(shapeIndex: number) {
    const now = Date.now();
    if (now - this.lastRealtimeUpdateSent < this.realtimeUpdateThrottle) {
      return;
    }
    this.lastRealtimeUpdateSent = now;

    const shapes = this.getShapes();
    const shape = shapes[shapeIndex];
    if (!shape || !shape.id) {
      console.log("⚠️ Shape has no ID, cannot send real-time update");
      return;
    }
    if (this.socket.readyState !== WebSocket.OPEN) {
      console.log("⚠️ WebSocket not open, cannot send real-time update");
      return;
    }

    const updateFields = getShapeUpdateFields(shape);
    const payload = {
      type: "realtime_update",
      roomId: this.roomId,
      shapeId: shape.id,
      shapeType: shape.type,
      update: updateFields,
    } as const;

    console.log("✨ Sending REAL-TIME update:", payload.shapeId, payload.update);
    this.socket.send(JSON.stringify(payload));
  }

  public sendDatabaseUpdate(shapeIndex: number) {
    const shapes = this.getShapes();
    const shape = shapes[shapeIndex];
    if (!shape || !shape.id) {
      console.warn("⚠️ Cannot update shape without database ID");
      return;
    }
    if (this.socket.readyState !== WebSocket.OPEN) {
      console.warn("⚠️ WebSocket not open, cannot send update");
      return;
    }

    const updateFields = getShapeUpdateFields(shape);
    const payload = {
      type: "update",
      roomId: this.roomId,
      shapeId: shape.id,
      shapeType: shape.type,
      update: updateFields,
    } as const;

    console.log("💾 Sending DATABASE update:", payload.shapeId, payload.update);
    this.socket.send(JSON.stringify(payload));
  }
}

function getShapeUpdateFields(shape: Shape & { id?: number }): Record<string, any> {
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


