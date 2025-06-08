import { WebSocketServer, WebSocket } from "ws";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "@repo/backend-common/config";
import {prismaClient} from "@repo/db/client";

const wss = new WebSocketServer({ port: 8081 });

interface User {
    ws: WebSocket,
    rooms: string[],
    userId: string
}

const users: User[] = [];

function checkUser(token: string): string | null {

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };

        if (!decoded || !decoded.userId) {
            return null;
        }

        return decoded.userId;
    } catch (error) {
        return null;
    }
}

wss.on('connection', function connection(ws, request) {
    try {
        const url = request.url;

        if (!url) {
            ws.close(1008, 'URL is required');
            return;
        }

        const queryParams = new URLSearchParams(url.split('?')[1]);
        const token = queryParams.get('token') || "";
        const userId = checkUser(token);

        if (!userId) {
            ws.close(1008, 'Invalid authentication');
            return;
        }

        users.push({
            ws,
            userId,
            rooms: []
        });

        ws.on('message', async function message(data) {
            try {
                const parsedData = JSON.parse(data as unknown as string);

                if (!parsedData || typeof parsedData.type !== 'string') {
                    ws.send(JSON.stringify({ error: 'Invalid message format' }));
                    return;
                }

                if (parsedData.type === "join_room") {
                    const user = users.find(x => x.ws === ws);
                    if (user && parsedData.roomId) {
                        user.rooms.push(parsedData.roomId);
                    }
                }

                if (parsedData.type === "leave_room") {
                    const user = users.find(x => x.ws === ws);
                    if (!user) return;
                    user.rooms = user.rooms.filter(x => x !== parsedData.roomId);
                }

                if (parsedData.type === "chat") {
                    const roomId = parsedData.roomId;
                    const message = parsedData.message;

                    if (!roomId || !message) {
                        ws.send(JSON.stringify({ error: 'Missing roomId or message' }));
                        return;
                    }

                    // Find the current user
                    const currentUser = users.find(x => x.ws === ws);
                    if (!currentUser) {
                        ws.send(JSON.stringify({ error: 'User not found' }));
                        return;
                    }

                    // Check if user has joined the room
                    if (!currentUser.rooms.includes(roomId)) {
                        ws.send(JSON.stringify({ error: 'You must join the room before sending messages' }));
                        return;
                    }

                    try {
                        await prismaClient.chat.create({
                            data: {
                                roomId,
                                message,
                                userId
                            }
                        });

                        // Broadcast to room members
                        users.forEach(user => {
                            if (user.rooms.includes(roomId)) {
                                try {
                                    user.ws.send(JSON.stringify({
                                        type: "chat",
                                        message: message,
                                        roomId
                                    }));
                                } catch (error) {
                                    console.error('Failed to send message to user:', error);
                                }
                            }
                        });
                    } catch (error) {
                        console.error('Database error:', error);
                        ws.send(JSON.stringify({ error: 'Failed to save message' }));
                    }
                }
            } catch (error) {
                console.error('Message processing error:', error);
                ws.send(JSON.stringify({ error: 'Invalid message format' }));
            }
        });

        ws.on('error', (error) => {
            console.error('WebSocket error:', error);
        });

        ws.on('close', () => {
            const index = users.findIndex(x => x.ws === ws);
            if (index !== -1) {
                users.splice(index, 1);
            }
        });

    } catch (error) {
        console.error('Connection error:', error);
        ws.close(1011, 'Internal server error');
    }
});

