import cors from "cors";
import rateLimit from "express-rate-limit";

export const corsConfig = cors({
    origin: "http://localhost:5173",
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"]
});

export const Loginlimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        status: 429,
        message: "Too many login attempts from this user, please try again after 15 minutes"
    }
});

export const Registerlimiter = rateLimit({
    windowMs: 30 * 60 * 1000,
    limit: 50,  
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {  
        status: 429,
        message: "Too many registration attempts from this user, please try again after 60 minutes"
    }
});
