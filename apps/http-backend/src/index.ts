import "dotenv/config";
import { JWT_SECRET } from "@repo/backend-common/config";
import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import { middleware } from "./middleware";
import { CreateRoomSchema, CreateUserSchema, SigninSchema, CreateElementSchema, UpdateElementSchema, UpdateSessionSchema } from "@repo/common/types";
import { prismaClient } from "@repo/db/client";
import bcrypt from "bcrypt";
import cookieParser from "cookie-parser";

const app = express();
app.use(cookieParser());
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        const allowedOrigins = [
            "http://localhost:3000",
            "https://collabdraw.vaibhavm.tech",
            // Allow any localhost port for development
            /^http:\/\/localhost:\d+$/,
            /^http:\/\/127\.0\.0\.1:\d+$/
        ];
        
        const isAllowed = allowedOrigins.some(allowed => {
            if (typeof allowed === 'string') {
                return origin === allowed;
            }
            return allowed.test(origin);
        });
        
        if (isAllowed) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    preflightContinue: false,
    optionsSuccessStatus: 200
}));
app.use(express.json());

app.post("/signup", async (req, res) => {
    const parseData = CreateUserSchema.safeParse(req.body);

    if (!parseData.success) {
        res.status(400).json({
            message: "Invalid input format",
            errors: parseData.error.errors, 
        });
        return;
    }

    const { name, username, email, password } = parseData.data;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prismaClient.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                username,
            },
        });

        res.status(201).json({
            userId: user.id,
            message: "User signed up successfully",
        });

        return;

    } catch (error) {
        console.error("Signup error:", error);
        res.status(500).json({
            message: "An internal server error occurred",
        });
        return;
    }
});

app.post("/login", async (req, res) => {
    const parseData = SigninSchema.safeParse(req.body);

    if (!parseData.success) {
        res.status(403).json({
            message: "invalid inputs"
        });
        return;
    }

    const user = await prismaClient.user.findUnique({
        where: {
            email: parseData.data.email
        }
    });

    if (!user) {
        res.status(403).json({
            message: "Not authorized"
        });
        return;
    }

    const validPassword = await bcrypt.compare(parseData.data.password, user.password);

    if (!validPassword) {
        res.status(401).json({
            message: "Incorrect Password!!",
        });
        return;
    }

    const token = jwt.sign({
        userId: user.id
    }, JWT_SECRET);

    const isProduction = process.env.NODE_ENV === 'production';
    
    res.cookie("token", token, { 
        httpOnly: true, 
        secure: isProduction, 
        maxAge: 86400000, 
        sameSite: isProduction ? 'none' : 'lax',
        domain: isProduction ? '.vaibhavm.tech' : undefined  // Allow cookie across subdomains
    });

    res.json({
        token
    });
});

app.post("/logout", (req, res) => {
    const isProduction = process.env.NODE_ENV === 'production';
    res.clearCookie("token", {
        domain: isProduction ? '.vaibhavm.tech' : undefined
    });
    res.status(200).send("Logout successfully");
});

app.post("/document", middleware, async (req, res) => {
    const parsed = CreateRoomSchema.safeParse(req.body);

    if (!parsed.success) {
        res.status(400).json({ message: "Invalid input" });
        return;
    }

    const { roomName } = parsed.data;

    const existing = await prismaClient.document.findUnique({
        where: { slug: roomName }
    });

    if (existing) {
        res.status(409).json({ message: "Document exists" });
        return;
    }

    const doc = await prismaClient.document.create({
        data: {
            title: roomName,
            slug: roomName,
            createdBy: Number(req.userId)
        }
    });

    res.json({ document: doc.id });
});

app.get("/documents", middleware, async (req, res) => {
    const docs = await prismaClient.document.findMany({
        where: {
            createdBy: Number(req.userId)
        }
    });

    res.json({
        documents: docs
    });
})

app.get("/document/:slug", middleware, async (req, res) => {
    const { slug } = req.params;
    const document = await prismaClient.document.findUnique({
        where: { slug },
        include: { elements: true }
    });

    if (!document) {
        res.status(404).json({
            message: "Not found"
        });
        return;
    }

    res.json({
        document
    });
});

app.get("/elements/:documentId", middleware, async (req, res) => {
    const elements = await prismaClient.element.findMany({
        where: { documentId: Number(req.params.documentId) },
        orderBy: { id: "asc" },
    });

    res.json({ elements });
});

app.delete("/documents/:id", middleware, async (req, res) => {
    const id = Number(req.params.id);

    if (isNaN(id)) {
        res.status(400).json({ message: "Invalid ID" });
        return;
    }

    try {
        // First, delete related records
        await prismaClient.userSession.deleteMany({
            where: { documentId: id },
        });

        await prismaClient.element.deleteMany({
            where: { documentId: id },
        });

        // Then, delete the document itself
        await prismaClient.document.delete({
            where: { id: id },
        });

        res.status(200).json({ message: "Document deleted successfully" });
    } catch (error) {
        console.error("Error deleting document:", error);
        res.status(500).json({ message: "Error deleting document" });
    }
});

app.post("/element", middleware, async (req, res) => {
    const parsed = CreateElementSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({
            message: "Invalid Input"
        });
        return;
    }

    const element = await prismaClient.element.create({ data: parsed.data });
    res.json({ element });
});

app.put("/element/:id", middleware, async (req, res) => {
    const parsed = UpdateElementSchema.safeParse(req.body);

    if (!parsed.success) {
        res.status(400).json({
            message: "Invalid Input"
        });
        return;
    }

    const updated = await prismaClient.element.update({
        where: { id: Number(req.params.id) },
        data: parsed.data
    });

    res.json({
        updated
    });
});

app.delete("/element", middleware, async (req, res) => {
    const { ids } = req.body;

    if (!Array.isArray(ids)) {
        res.status(400).json({
            message: "Invalid Ids"
        });
        return;
    }

    await prismaClient.element.deleteMany({ where: { id: { in: ids } } });

    res.json({
        message: "Deleted"
    });
});

app.post("/session/update", middleware, async (req, res) => {
    const parsed = UpdateSessionSchema.safeParse(req.body);

    if (!parsed.success) {
        res.status(400).json({
            message: "Invalid Input"
        });
        return;
    }

    const { documentId, cursorX, cursorY, selectedElementIds } = parsed.data;
    const session = await prismaClient.userSession.upsert({
        where: {
            userId_documentId: {
                userId: Number(req.userId),
                documentId,
            },
        },
        update: {
            cursorX,
            cursorY,
            selectedElementIds,
            lastActiveAt: new Date(),
        },
        create: {
            userId: Number(req.userId),
            documentId,
            cursorX,
            cursorY,
            selectedElementIds,
        },
    });

    res.json({ session });
});

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`Server running on http://localhost:${port}`));