import {NextFunction, Request, Response} from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "./config";

// Override the types of the express request object.
declare global{
    namespace Express {
        interface Request {
            userId?: string | number
        }
    }
}

export function middleware(req: Request, res: Response, next:NextFunction){

    const token = req.headers["authorization"] ?? "";

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string | number};

    if(decoded.userId){
        req.userId = decoded.userId;
        next();
    }else{
        res.status(403).json({
            message: "Unauthorized !!"
        })
    }

}
