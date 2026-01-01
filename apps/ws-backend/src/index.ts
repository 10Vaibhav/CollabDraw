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
    | { type: "arrow"; startX: number; startY: number; endX: number; endY: number }
    | { type: "diamond"; centerX: number; centerY: number; width: number; height: number }
    | { type: "ellipse"; centerX: number; centerY: number; radiusX: number; radiusY: number }
    | { type: "parallelogram"; x: number; y: number; width: number; height: number; skew: number }
    | { type: "eraser"; cordinates: { x: number; y: number }[] };

interface IncomingMessage {
    type: string;
    roomId?: string;
    shape?: Shape;
    shapeId?: number;
    shapeType?: string;
    update?: Record<string, any>;
    [key: string]: any; // For move/update message fields
}

const wss = new WebSocketServer({ port: 3002 });
const users: User[] = [];
const rooms = new Map<string, Set<WebSocket>>();

// --- Utility function ---
function pick<T extends object, K extends keyof T>(obj: T, keys: K[]) {
    const out: Partial<T> = {};
    for (const k of keys) {
        if (obj[k] !== undefined) out[k] = obj[k];
    }
    return out;
}

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
        console.warn(`Room ${roomId} not found for broadcasting`);
        return;
    }

    const messageString = JSON.stringify(message);
    let broadcastCount = 0;
    
    for (const client of room) {
        if (client !== sender && client.readyState === WebSocket.OPEN) {
            client.send(messageString);
            broadcastCount++;
        }
    }
    
    console.log(`Broadcasted to ${broadcastCount} clients in room ${roomId}`);
}

// --- Main Connection Handler ---
wss.on("connection", (ws, request) => {
    const url = request.url;
    if (!url) {
        console.warn("No URL provided, closing connection");
        return ws.close();
    }

    const queryParams = new URLSearchParams(url.split("?")[1]);
    const token = queryParams.get("token") || "";
    const userId = checkUser(token);
    if (!userId) {
        console.warn("Invalid token, closing connection");
        return ws.close();
    }

    // Register user
    const user: User = { ws, userId };
    users.push(user);

    console.log(`User ${userId} connected. Total users: ${users.length}`);

    // --- Error handler for this socket ---
    ws.on("error", (err) => {
        console.error("WebSocket error:", err);
    });

    ws.on("message", async (raw) => {
        let msg: IncomingMessage;
        try {
            msg = typeof raw === "string" ? JSON.parse(raw) : JSON.parse(raw.toString());
        } catch {
            console.warn("Invalid JSON received");
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: "error", message: "Invalid JSON" }));
            }
            return;
        }

        console.log(`Received: ${msg.type} from user ${userId} for room ${msg.roomId}`);

        // --- Room Join/Leave Logic ---
        if (msg.type === "join_room" && msg.roomId) {
            let room = rooms.get(msg.roomId);
            if (!room) {
                room = new Set();
                rooms.set(msg.roomId, room);
                console.log(`Created new room: ${msg.roomId}`);
            }
            room.add(ws);
            console.log(`User joined room ${msg.roomId}. Room size: ${room.size}`);
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: "joined_room", roomId: msg.roomId }));
            }
            return;
        }
        
        if (msg.type === "leave_room" && msg.roomId) {
            const room = rooms.get(msg.roomId);
            if (room) {
                room.delete(ws);
                console.log(`User left room ${msg.roomId}. Room size: ${room.size}`);
                if (room.size === 0) {
                    rooms.delete(msg.roomId);
                    console.log(`Empty room ${msg.roomId} deleted`);
                }
            }
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: "left_room", roomId: msg.roomId }));
            }
            return;
        }

        // --- CRITICAL FIX: Real-time Updates (NO database save) ---
        if (msg.type === "realtime_update" && msg.roomId && typeof msg.shapeId === "number" && msg.update) {
            console.log(`REAL-TIME update for shape ${msg.shapeId}:`, msg.update);
            
            // IMMEDIATELY broadcast to other users for INSTANT visual feedback
            // NO database operation here - just live collaboration
            const broadcastMessage = {
                type: "realtime_update",
                roomId: msg.roomId,
                shapeId: msg.shapeId,
                update: msg.update
            };
            
            console.log(`Broadcasting REAL-TIME update to room: ${msg.roomId}`);
            broadcastToRoom(msg.roomId, broadcastMessage, ws);

            return; // CRITICAL: No database write for real-time updates
        }

        // --- Database Updates (WITH database persistence) ---
        if (msg.type === "update" && msg.roomId && typeof msg.shapeId === "number" && msg.shapeType && msg.update) {
            console.log(`DATABASE update for shape ${msg.shapeId}:`, msg.update);
            
            try {
                // Map update fields to database fields for each shape type
                const updateData: any = {};
                
                switch (msg.shapeType) {
                    case "rect":
                        if (msg.update.x !== undefined) updateData.x = msg.update.x;
                        if (msg.update.y !== undefined) updateData.y = msg.update.y;
                        if (msg.update.width !== undefined) updateData.width = msg.update.width;
                        if (msg.update.height !== undefined) updateData.height = msg.update.height;
                        break;
                    case "circle":
                        if (msg.update.centerX !== undefined) updateData.centerX = msg.update.centerX;
                        if (msg.update.centerY !== undefined) updateData.centerY = msg.update.centerY;
                        if (msg.update.radius !== undefined) updateData.radius = msg.update.radius;
                        break;
                    case "line":
                    case "arrow":
                        if (msg.update.startX !== undefined) updateData.startX = msg.update.startX;
                        if (msg.update.startY !== undefined) updateData.startY = msg.update.startY;
                        if (msg.update.endX !== undefined) updateData.endX = msg.update.endX;
                        if (msg.update.endY !== undefined) updateData.endY = msg.update.endY;
                        break;
                    case "diamond":
                        if (msg.update.centerX !== undefined) updateData.centerX = msg.update.centerX;
                        if (msg.update.centerY !== undefined) updateData.centerY = msg.update.centerY;
                        if (msg.update.width !== undefined) updateData.width = msg.update.width;
                        if (msg.update.height !== undefined) updateData.height = msg.update.height;
                        break;
                    case "ellipse":
                        if (msg.update.centerX !== undefined) updateData.centerX = msg.update.centerX;
                        if (msg.update.centerY !== undefined) updateData.centerY = msg.update.centerY;
                        if (msg.update.radiusX !== undefined) updateData.radiusX = msg.update.radiusX;
                        if (msg.update.radiusY !== undefined) updateData.radiusY = msg.update.radiusY;
                        break;
                    case "parallelogram":
                        if (msg.update.x !== undefined) updateData.x = msg.update.x;
                        if (msg.update.y !== undefined) updateData.y = msg.update.y;
                        if (msg.update.width !== undefined) updateData.width = msg.update.width;
                        if (msg.update.height !== undefined) updateData.height = msg.update.height;
                        if (msg.update.skew !== undefined) updateData.skew = msg.update.skew;
                        break;
                    default:
                        console.warn("Unknown shape type for update:", msg.shapeType);
                        return;
                }

                console.log(`Updating database with:`, updateData);

                // Update shape in database
                await prismaClient.element.update({
                    where: { id: Number(msg.shapeId) },
                    data: updateData
                });

                console.log(`Successfully updated shape ${msg.shapeId} in database`);

                // Broadcast final update to all users in room (except sender)
                const broadcastMessage = {
                    type: "update",
                    roomId: msg.roomId,
                    shapeId: msg.shapeId,
                    update: updateData
                };
                
                console.log(`Broadcasting DATABASE update to room: ${msg.roomId}`);
                broadcastToRoom(msg.roomId, broadcastMessage, ws);

            } catch (error) {
                console.error(`Failed to persist shape update for ${msg.shapeId}:`, error);
                // Notify sender about failure
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ 
                        type: "error", 
                        message: "Failed to save shape update to database",
                        shapeId: msg.shapeId
                    }));
                }
            }
            
            return;
        }

        // --- Shape/Canvas Drawing Logic ---
        if (msg.type === "draw" && msg.roomId && msg.shape) {
            const shape = msg.shape;
            console.log(`rocessing draw: ${shape.type}`);

            // Broadcast to all users in the room (except sender) first for responsiveness
            const drawMessage = {
                type: "draw",
                shape: msg.shape,
                roomId: msg.roomId,
            };
            console.log(`Broadcasting draw to room: ${msg.roomId}`);
            broadcastToRoom(msg.roomId, drawMessage, ws);

            // Then, attempt to save to DB
            try {
                if (shape.type !== "eraser") {
                    // Map shape to DB fields for each type
                    let dbData: any = {
                        documentId: Number(msg.roomId),
                        type: shape.type,
                        strokeColor: "#ffffff",
                    };

                    // Handle all shape types with proper field mapping
                    switch (shape.type) {
                        case "rect":
                            dbData = { 
                                ...dbData, 
                                x: shape.x, 
                                y: shape.y, 
                                width: shape.width, 
                                height: shape.height 
                            };
                            break;
                        case "circle":
                            dbData = { 
                                ...dbData, 
                                centerX: shape.centerX, 
                                centerY: shape.centerY, 
                                radius: shape.radius 
                            };
                            break;
                        case "line":
                        case "arrow":
                            dbData = { 
                                ...dbData, 
                                startX: shape.startX, 
                                startY: shape.startY, 
                                endX: shape.endX, 
                                endY: shape.endY 
                            };
                            break;
                        case "diamond":
                            dbData = { 
                                ...dbData, 
                                centerX: shape.centerX, 
                                centerY: shape.centerY, 
                                width: shape.width, 
                                height: shape.height 
                            };
                            break;
                        case "ellipse":
                            // Store ellipse with proper radiusX and radiusY fields
                            dbData = { 
                                ...dbData, 
                                centerX: shape.centerX, 
                                centerY: shape.centerY, 
                                radiusX: shape.radiusX,
                                radiusY: shape.radiusY
                            };
                            break;
                        case "parallelogram":
                            // Store parallelogram with proper skew field
                            dbData = { 
                                ...dbData, 
                                x: shape.x, 
                                y: shape.y, 
                                width: shape.width, 
                                height: shape.height,
                                skew: shape.skew
                            };
                            break;
                    }

                    const createdElement = await prismaClient.element.create({ data: dbData });
                    console.log(`Successfully saved ${shape.type} to database with ID: ${createdElement.id}`);

                    // Send back the created element ID to the sender so they can track it for moves/resizes
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({
                            type: "shape_created",
                            tempShape: shape,
                            dbId: createdElement.id,
                            roomId: msg.roomId
                        }));
                    }

                } else {
                    // Eraser logic: delete shapes in DB that intersect with eraser points
                    console.log(`Processing eraser with ${shape.cordinates.length} points`);
                    let deletedCount = 0;
                    
                    for (const point of shape.cordinates) {
                        // Delete elements that are close to the eraser point
                        const deleteResult = await prismaClient.element.deleteMany({
                            where: {
                                documentId: Number(msg.roomId),
                                OR: [
                                    // For rect and parallelogram
                                    {
                                        AND: [
                                            { x: { not: null } },
                                            { y: { not: null } },
                                            { x: { lte: point.x + 20 } },
                                            { y: { lte: point.y + 20 } },
                                            { x: { gte: point.x - 20 } },
                                            { y: { gte: point.y - 20 } }
                                        ]
                                    },
                                    // For circle, diamond, ellipse
                                    {
                                        AND: [
                                            { centerX: { not: null } },
                                            { centerY: { not: null } },
                                            { centerX: { lte: point.x + 20 } },
                                            { centerY: { lte: point.y + 20 } },
                                            { centerX: { gte: point.x - 20 } },
                                            { centerY: { gte: point.y - 20 } }
                                        ]
                                    },
                                    // For line and arrow
                                    {
                                        AND: [
                                            { startX: { not: null } },
                                            { startY: { not: null } },
                                            { startX: { lte: point.x + 20 } },
                                            { startY: { lte: point.y + 20 } },
                                            { startX: { gte: point.x - 20 } },
                                            { startY: { gte: point.y - 20 } }
                                        ]
                                    }
                                ]
                            },
                        });
                        deletedCount += deleteResult.count;
                    }
                    console.log(`Eraser deleted ${deletedCount} shapes from database`);
                }
            } catch (e) {
                console.error("Database operation failed:", e);
                // We don't send a message back to the user because the drawing was already broadcast.
                // The frontend will be out of sync with the DB, but that's a problem for another time.
            }
            return;
        }

        // --- Unknown Message Type ---
        console.log(`Received unknown message type: ${msg.type}`);
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "error", message: "Unknown message type: " + msg.type }));
        }
    });

    ws.on("close", () => {
        console.log(`User ${userId} disconnected`);
        
        // Remove user on disconnect
        // On close, remove user from all rooms
        rooms.forEach((room, roomId) => {
            if (room.has(ws)) {
                room.delete(ws);
                console.log(`User removed from room ${roomId}. New size: ${room.size}`);
                if (room.size === 0) {
                    rooms.delete(roomId);
                    console.log(`Empty room ${roomId} deleted`);
                }
            }
        });

        // Remove user from users array
        const idx = users.findIndex((u) => u.ws === ws);
        if (idx !== -1) users.splice(idx, 1);
        
        console.log(`Total users remaining: ${users.length}`);
    });
});

