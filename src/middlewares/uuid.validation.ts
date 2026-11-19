import type { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/AppError.ts";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (value: unknown): value is string =>
    typeof value === "string" && UUID_PATTERN.test(value);

// Rejects the request with 400 when any of the named route params is not a UUID,
// so a malformed id never reaches a database query.
export const validateUuidParams = (...names: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const invalid = names.filter((name) => !isUuid(req.params[name]));
        if (invalid.length > 0) {
            return next(new AppError(`Invalid ${invalid.join(", ")}: must be a valid UUID`, 400));
        }
        next();
    };
};