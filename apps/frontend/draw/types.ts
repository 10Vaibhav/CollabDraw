export type Shape =
  | { type: "rect"; x: number; y: number; width: number; height: number }
  | { type: "circle"; centerX: number; centerY: number; radius: number }
  | { type: "line"; startX: number; startY: number; endX: number; endY: number }
  | { type: "arrow"; startX: number; startY: number; endX: number; endY: number }
  | { type: "diamond"; centerX: number; centerY: number; width: number; height: number }
  | { type: "ellipse"; centerX: number; centerY: number; radiusX: number; radiusY: number }
  | { type: "parallelogram"; x: number; y: number; width: number; height: number; skew: number }
  | { type: "eraser"; cordinates: Cordinate[] };

export interface Cordinate {
  x: number;
  y: number;
}

export type ResizeHandle = "nw" | "ne" | "sw" | "se" | "n" | "s" | "e" | "w" | null;


