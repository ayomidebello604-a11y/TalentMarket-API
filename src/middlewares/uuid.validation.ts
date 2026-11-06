import { Request, Response, NextFunction } from "express";

import { AppError } from "../errors/AppError.ts";

export const validateUUID = (req: Request, res: Response, next: NextFunction) => {
    const { playerId } = req.params;

    if (!playerId) {
        return next(new AppError("Player ID is required", 400));
    }

    next();
};