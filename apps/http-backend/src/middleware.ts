import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "@repo/backend-common/config";

// Override the types of the express request object.
declare global {
    namespace Express {
        interface Request {
            userId?: string
        }
    }
}

export function middleware(req: Request, res: Response, next: NextFunction) {
    try {
        const authHeader = req.headers["authorization"];

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            res.status(401).json({
                message: "Authorization header missing or invalid format. Expected: 'Bearer <token>'"
            });
            return;
        }

        const token = authHeader.split(" ")[1];

        if (!token) {
            res.status(401).json({
                message: "No token provided"
            });
            return;
        }

        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string | number };

        if (!decoded.userId) {
            res.status(403).json({
                message: "Invalid token payload"
            });
            return;
        }

        // Convert userId to string if it's a number
        req.userId = decoded.userId.toString();
        next();
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            res.status(401).json({
                message: "Invalid token"
            });
            return;
        }
        res.status(500).json({
            message: "Internal server error"
        });
        return;
    }
}
