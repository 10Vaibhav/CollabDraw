import { JWT_SECRET } from "@repo/backend-common/config";
import { WebSocket, WebSocketServer } from "ws";
import jwt from "jsonwebtoken";
import { prismaClient } from "@repo/db/client";

// --- Types ---
interface User {
    ws: WebSocket;
    rooms: Set<string>;
    userId: string;
}

type Shape =
    | { type: "rect"; x: number; y: number; width: number; height: number }
    | { type: "circle"; centerX: number; centerY: number; radius: number }
    | { type: "line"; startX: number; startY: number; endX: number; endY: number }
    | { type: "eraser"; cordinates: { x: number; y: number }[] };

interface IncomingMessage {
    type: string;
    roomId?: string;
    shape?: Shape;
}

const wss = new WebSocketServer({ port: 3002 });
const users: User[] = [];

// --- Auth ---
function checkUser(token: string): string | null {
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        return decoded?.userId || null;
    } catch {
        return null;
    }
}

// --- Broadcast Helper ---
function broadcastToRoom(roomId: string, data: any, exceptWs?: WebSocket) {
    users.forEach((user) => {
        if (
            user.rooms.has(roomId) &&
            user.ws.readyState === WebSocket.OPEN &&
            user.ws !== exceptWs
        ) {
            user.ws.send(JSON.stringify(data));
        }
    });
}

// --- Main Connection Handler ---
wss.on("connection", (ws, request) => {
    const url = request.url;
    if (!url) return ws.close();

    const queryParams = new URLSearchParams(url.split("?")[1]);
    const token = queryParams.get("token") || "";
    const userId = checkUser(token);
    if (!userId) return ws.close();

    // Register user
    const user: User = { ws, rooms: new Set(), userId };
    users.push(user);

    // --- Error handler for this socket ---
    ws.on("error", (err) => {
        console.error("WebSocket error:", err);
    });

    ws.on("message", async (raw) => {
        let msg: IncomingMessage;
        try {
            msg = typeof raw === "string" ? JSON.parse(raw) : JSON.parse(raw.toString());
        } catch {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: "error", message: "Invalid JSON" }));
            }
            return;
        }

        // --- Room Join/Leave Logic ---
        if (msg.type === "join_room" && msg.roomId) {
            user.rooms.add(msg.roomId);
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: "joined_room", roomId: msg.roomId }));
            }
            return;
        }
        if (msg.type === "leave_room" && msg.roomId) {
            user.rooms.delete(msg.roomId);
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: "left_room", roomId: msg.roomId }));
            }
            return;
        }

        // --- Shape/Canvas Logic ---
        if (msg.type === "chat" && msg.roomId && msg.shape) {
            try {
                const shape = msg.shape;

                // Save to DB if not eraser
                if (shape.type !== "eraser") {
                    // Map shape to DB fields for each type
                    let dbData: any = {
                        documentId: Number(msg.roomId),
                        type: shape.type,
                        strokeColor: "#ffffff",
                    };
                    if (shape.type === "rect") {
                        dbData = {
                            ...dbData,
                            x: shape.x,
                            y: shape.y,
                            width: shape.width,
                            height: shape.height,
                        };
                    } else if (shape.type === "circle") {
                        dbData = {
                            ...dbData,
                            centerX: shape.centerX,
                            centerY: shape.centerY,
                            radius: shape.radius
                        };
                    } else if (shape.type === "line") {
                        dbData = {
                            ...dbData,
                            startX: shape.startX,
                            startY: shape.startY,
                            endX: shape.endX,
                            endY: shape.endY
                        };
                    }
                    await prismaClient.element.create({ data: dbData });
                } else {
                    // Eraser logic: delete shapes in DB that intersect with eraser points
                    for (const point of shape.cordinates) {
                        await prismaClient.element.deleteMany({
                            where: {
                                documentId: Number(msg.roomId),
                                x: { gte: point.x - 20, lte: point.x + 20 },
                                y: { gte: point.y - 20, lte: point.y + 20 },
                            },
                        });
                    }
                }

                // Broadcast to all users in the room (except sender)
                broadcastToRoom(
                    msg.roomId,
                    {
                        type: "chat",
                        shape: msg.shape,
                        roomId: msg.roomId,
                    },
                    ws
                );
            } catch (e) {
                console.error("Shape error or DB error:", e);
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(
                        JSON.stringify({ type: "error", message: "Shape error or DB error" })
                    );
                }
            }
            return;
        }

        // --- Unknown Message Type ---
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "error", message: "Unknown message type" }));
        }
    });

    ws.on("close", () => {
        // Remove user on disconnect
        const idx = users.findIndex((u) => u.ws === ws);
        if (idx !== -1) users.splice(idx, 1);
    });
});
