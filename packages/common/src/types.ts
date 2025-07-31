import {z} from "zod";

export const CreateUserSchema = z.object({
    username: z.string().min(3).max(20),
    password: z.string().min(6),
    name: z.string().min(1),
    email: z.string().email(),
});

export const SigninSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
});

export const CreateRoomSchema = z.object({
    roomName: z.string().min(3).max(20)
});

export const CreateElementSchema = z.object({
    documentId: z.number(),
    type: z.string(),
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
    strokeColor: z.string(),
    fillColor: z.string(),
});

export const UpdateElementSchema = z.object({
    type: z.string().optional(),
    x: z.number().optional(),
    y: z.number().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    strokeColor: z.string().optional(),
    fillColor: z.string().optional(),
});

export const UpdateSessionSchema = z.object({
    documentId: z.number(),
    cursorX: z.number(),
    cursorY: z.number(),
    selectedElementIds: z.array(z.number()),
});

