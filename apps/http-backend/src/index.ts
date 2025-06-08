import express from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "@repo/backend-common/config";
import { middleware } from "./middleware";
import { CreateRoomSchema, CreateUserSchema, SigninSchema } from "@repo/common/types";
import { prismaClient } from "@repo/db/client";

const app = express();
app.use(express.json());

app.post("/signup", async (req, res) => {

    const parseData = CreateUserSchema.safeParse(req.body);

    if (!parseData.success) {
        res.status(403).json({
            message: "invalid inputs"
        });
        return;
    }

    try {
        await prismaClient.user.create({
            data: {
                email: parseData.data.username,
                password: parseData.data.password,
                name: parseData.data.name
            }
        });

        res.json({
            userId: "123"
        });
    } catch (error) {
        res.status(411).json({
            message: "User already exists with the username"
        });
    }
});

app.post("/signin", (req, res) => {

    const userId = 1;

    const data = SigninSchema.safeParse(req.body);

    if (!data.success) {
        res.status(403).json({
            message: "invalid inputs"
        });
        return;
    }

    const token = jwt.sign({
        userId
    }, JWT_SECRET);

    res.json({
        token
    });
});

app.post("/room", middleware, (req, res) => {
    // db call

    const data = CreateRoomSchema.safeParse(req.body);

    if (!data.success) {
        res.status(403).json({
            message: "invalid inputs"
        });
        return;
    }

    res.json({
        roomId: 123
    })
});

app.listen(3001);
