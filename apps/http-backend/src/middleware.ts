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
    const token = req.cookies.token;

    if (!token) {
        res.status(401).json({ message: "No token provided" });
        return;
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string | number };

        if (!decoded || !decoded.userId) {
            res.status(403).json({ message: "Invalid token payload" });
            return;
        }

        req.userId = decoded.userId.toString();
        next();
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            res.status(401).json({ message: "Invalid or expired token" });
            return;
        }
        
        console.error("Middleware error:", error);
        res.status(500).json({ message: "Internal server error" });
        return;
    }
}
