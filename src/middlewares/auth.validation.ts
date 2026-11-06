import type { Request, Response, NextFunction } from "express";
import { RegisterSchema,LoginSchema } from "../schemas/auth.schema.ts";
import { jwtVerify } from "jose";
import { AppError } from "../errors/AppError.ts";

export const validateRegisterBody = (req: Request, res: Response, next: NextFunction) => {
  const validatedRegisterBody = RegisterSchema.safeParse(req.body);
  if (!validatedRegisterBody.success) {
      const errorDetails = validatedRegisterBody.error.issues.map((issue) => {
        const field = issue.path.length > 0
          ? issue.path.map(String).join(".").replace(/([a-z])([A-Z])/g, "$1 $2")
          : "Request body";
        const readableField = field.charAt(0).toUpperCase() + field.slice(1);

        return `- ${readableField}: ${issue.message}`;
      });

      return next(new AppError(`Please check your registration details:\n${errorDetails.join("\n")}`, 400));
  } else {
        req.validatedRegisterBody = validatedRegisterBody.data;
        next();
  }
}

export const validateLoginBody = (req: Request, res: Response, next: NextFunction) => {
    const validatedLoginBody = LoginSchema.safeParse(req.body);

    if (!validatedLoginBody.success) {
        const errorDetails = validatedLoginBody.error.issues.map((issue) => {
            const field = issue.path.length > 0
                ? issue.path.map(String).join(".").replace(/([a-z])([A-Z])/g, "$1 $2")
                : "Request body";

            const readableField = field.charAt(0).toUpperCase() + field.slice(1);

            return `${readableField}: ${issue.message}`;
        });

        return next(
            new AppError(
                `Please check your login details: ${errorDetails.join("; ")}`,
                400
            )
        );
    }

    req.validatedLoginBody = validatedLoginBody.data;
    next();
};

export const verifyUserToken = async (req: Request, res: Response, next: NextFunction) => {
    try { 
       const authHeader = req.headers.authorization;
       if (!authHeader || !authHeader.startsWith("Bearer ")) {
           return next(new AppError("Authorization header missing or malformed", 401));
       }
       const token = authHeader.split(" ")[1];
       if (!token) {
           return next(new AppError("Token not provided", 401));
       }
       const secret = new TextEncoder().encode(process.env.JWT_SECRET);
     
       const { payload } = await jwtVerify(token, secret);
       if (!payload.sub || typeof payload.sub !== "string") {
           throw new AppError("Invalid token payload", 401);
       }
       if (typeof payload.role !== "string") {
           throw new AppError("Invalid token payload", 401);
       }

       req.userId = payload.sub;
       req.userRole = payload.role;
       next();
    } catch(error) {
       next(error);
    }
};



export const authorizeRoles = (...allowedRoles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.userRole || !allowedRoles.includes(req.userRole)) {
            return next(new AppError("You are not authorized to access this resource", 403));
        }

        next();
    };
};

