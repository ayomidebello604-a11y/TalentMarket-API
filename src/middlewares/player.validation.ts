import type { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/AppError.ts";
import { createPlayerProfileSchema, updatePlayerProfileSchema } from "../schemas/user.schema.ts";

export const validatePlayerInput = (req: Request, res: Response, next: NextFunction) => {
    const validatedPlayerInput = createPlayerProfileSchema.safeParse(req.body);

    if (!validatedPlayerInput.success) {
        const errorDetails = validatedPlayerInput.error.issues.map((issue) => {
            const field = issue.path.length > 0
                ? issue.path.map(String).join(".").replace(/([a-z])([A-Z])/g, "$1 $2")
                : "Request body";

            const readableField = field.charAt(0).toUpperCase() + field.slice(1);

            return `${readableField}: ${issue.message}`;
        });

        return next(
            new AppError(
                `Please check your player details: ${errorDetails.join("; ")}`,
                400
            )
        );
    }

    req.validatedPlayerInput = validatedPlayerInput.data;
    next();
};


export const validatingUpdatePlayerInput = (req: Request, res: Response, next: NextFunction) => {
    const validatedPlayerInput = updatePlayerProfileSchema.safeParse(req.body);

    if (!validatedPlayerInput.success) {
        const errorDetails = validatedPlayerInput.error.issues.map((issue) => {
            const field = issue.path.length > 0
                ? issue.path.map(String).join(".").replace(/([a-z])([A-Z])/g, "$1 $2")
                : "Request body";

            const readableField = field.charAt(0).toUpperCase() + field.slice(1);

            return `${readableField}: ${issue.message}`;
        });

        return next(
            new AppError(
                `Please check your player update details: ${errorDetails.join("; ")}`,
                400
            )
        );
    }

    req.validatedPlayerInput = validatedPlayerInput.data;
    next();
};