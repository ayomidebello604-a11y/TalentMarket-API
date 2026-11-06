import type { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/AppError.ts";
import { LoginUserService,logoutUserService, registerUserService, updateUserService,verifyTokenService, deleteUserService } from "../services/auth.service.ts";

export const registerUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const input = req.validatedRegisterBody;
        const newUser = await registerUserService(input);
        const { password_hash, ...userWithoutPassword } = newUser as (typeof newUser & { password_hash?: string });
        res.status(201).json({
            message: "User registered successfully",
            newUser: userWithoutPassword
        });
    } catch(error) {
        next(error);
    }
};

export const LoginUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const input = req.validatedLoginBody;
        const loginResult = await LoginUserService(input.email, input.password);
        res.cookie("refreshToken", loginResult.refresh_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 24 * 60 * 60 * 1000,
    path: "/api/users"
});
        res.status(200).json({
            message: "User logged in successfully",
            ...loginResult
        });
    } catch(error) {
        next(error);
    }
};

export const logoutUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const refreshToken = req.cookies?.refreshToken;
        if (!refreshToken) {
            throw new AppError("Refresh token required", 401);
        }
        const logoutResult = await logoutUserService(refreshToken);
        res.clearCookie("refreshToken", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            path: "/api/users"
        });
        res.status(200).json({
            message: "User logged out successfully",
            expiredSessionId: logoutResult.expiredSessionId
        });
    } catch(error) {
        next(error);
    }
};

export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, email } = req.body;
        const userId = req.userId;
        const updatedUser = await updateUserService(name, email, userId);
        res.status(200).json({
            message: "User updated successfully",
            updatedUser
        });
    } catch(error) {
        next(error);
    }
};

export const deleteUser = async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
        const userId = req.params.id;
        await deleteUserService(userId);
        res.status(200).json({
            message: "User deleted successfully"
        });
    } catch(error) {
        next(error);
    }
};

export const refreshToken = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const refreshToken = req.cookies?.refreshToken;

        if (!refreshToken) {
            throw new AppError("Refresh token required", 401);
        }

        const tokens = await verifyTokenService(refreshToken);

        res.cookie("refreshToken", tokens.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 24 * 60 * 60 * 1000,
            path: "/api/users"
        });

        return res.status(200).json({
            session_id: tokens.session_id,
            user_id: tokens.user_id,
            access_token: tokens.access_token,
            expires_at: tokens.expires_at
        });

    } catch (error) {
        next(error);
    }
};
