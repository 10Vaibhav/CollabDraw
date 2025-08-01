import { JWT_SECRET } from "@repo/backend-common/config";
import { WebSocket, WebSocketServer } from "ws";
import jwt from "jsonwebtoken";
import { prismaClient } from "@repo/db/client";

// --- Types ---
interface User {
    ws: WebSocket;
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
const rooms = new Map<string, Set<WebSocket>>();

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
function broadcastToRoom(roomId: string, message: any, sender: WebSocket) {
    const room = rooms.get(roomId);
    if (!room) {
        return;
    }

    const messageString = JSON.stringify(message);
    for (const client of room) {
        if (client !== sender && client.readyState === WebSocket.OPEN) {
            client.send(messageString);
        }
    }
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
    const user: User = { ws, userId };
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
            let room = rooms.get(msg.roomId);
            if (!room) {
                room = new Set();
                rooms.set(msg.roomId, room);
            }
            room.add(ws);
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: "joined_room", roomId: msg.roomId }));
            }
            return;
        }
        if (msg.type === "leave_room" && msg.roomId) {
            const room = rooms.get(msg.roomId);
            if (room) {
                room.delete(ws);
                if (room.size === 0) {
                    rooms.delete(msg.roomId);
                }
            }
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: "left_room", roomId: msg.roomId }));
            }
            return;
        }

        // --- Shape/Canvas Logic ---
        if (msg.type === "draw" && msg.roomId && msg.shape) {
            const shape = msg.shape;

            // Broadcast to all users in the room (except sender) first for responsiveness
            broadcastToRoom(
                msg.roomId,
                {
                    type: "draw",
                    shape: msg.shape,
                    roomId: msg.roomId,
                },
                ws
            );

            // Then, attempt to save to DB
            try {
                if (shape.type !== "eraser") {
                    // Map shape to DB fields for each type
                    let dbData: any = {
                        documentId: Number(msg.roomId),
                        type: shape.type,
                        strokeColor: "#ffffff",
                    };

                    if (shape.type === "rect" || shape.type === "circle" || shape.type === "line") {
                        dbData = { ...dbData, ...shape };
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
            } catch (e) {
                console.error("Database operation failed:", e);
                // We don't send a message back to the user because the drawing was already broadcast.
                // The frontend will be out of sync with the DB, but that's a problem for another time.
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
        // On close, remove user from all rooms
        rooms.forEach((room, roomId) => {
            if (room.has(ws)) {
                room.delete(ws);
                if (room.size === 0) {
                    rooms.delete(roomId);
                }
            }
        });

        // Remove user from users array
        const idx = users.findIndex((u) => u.ws === ws);
        if (idx !== -1) users.splice(idx, 1);
    });
});
