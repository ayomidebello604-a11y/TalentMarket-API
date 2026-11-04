import type { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/AppError.ts";
import { createScoutProfileSchema } from "../schemas/user.schema.ts";

export const validatedScoutInput = (req: Request, res: Response, next: NextFunction) => {
    const validatedScoutInput = createScoutProfileSchema.safeParse(req.body);   

    if (!validatedScoutInput.success) {
        const errorDetails = validatedScoutInput.error.issues.map((issue) => {
            const field = issue.path.length > 0
                ? issue.path.map(String).join(".").replace(/([a-z])([A-Z])/g, "$1 $2")
                : "Request body";

            const readableField = field.charAt(0).toUpperCase() + field.slice(1);

            return `${readableField}: ${issue.message}`;
        });

        return next(
            new AppError(
                `Please check your scout details: ${errorDetails.join("; ")}`,
                400
            )
        );
    }

    req.validatedScoutInput = validatedScoutInput.data;
    next();
};

