import type { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/AppError.ts";
import { randomBytes } from "node:crypto";
import { googleClient } from "../config/google-oauth.ts";
import { googleAuthService } from "../services/google-oauth.service.ts";
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


export const googleAuth = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { user_type } = req.query;

        if (
            user_type !== "player" &&
            user_type !== "scout"
        ) {
            throw new AppError("Invalid user type", 400);
        }

        const state = randomBytes(16).toString("hex");

        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax" as const,
            maxAge: 10 * 60 * 1000,
            path: "/api/users/google"
        };

        res.cookie("oauth_state", state, cookieOptions);
        res.cookie("oauth_user_type", user_type, cookieOptions);

        const authUrl = googleClient.generateAuthUrl({
            access_type: "offline",
            scope: ["openid", "email", "profile"],
            state,
            prompt: "consent"
        });
console.log(process.env.GOOGLE_CALLBACK_URL);
        return res.redirect(authUrl);

    } catch (error) {
        next(error);
    }
};


export const googleAuthCallback = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { code, state } = req.query;

        const storedState = req.cookies?.oauth_state;
        const userType = req.cookies?.oauth_user_type;

        // Validate OAuth state
        if (
            typeof state !== "string" ||
            !storedState ||
            state !== storedState
        ) {
            throw new AppError("Invalid OAuth state", 401);
        }

        // Validate user type
        if (userType !== "player" && userType !== "scout") {
            throw new AppError("Invalid user type", 400);
        }

        // Clear temporary OAuth cookies
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax" as const,
            path: "/api/users/google"
        };

        res.clearCookie("oauth_state", cookieOptions);
        res.clearCookie("oauth_user_type", cookieOptions);

        if (typeof code !== "string") {
            throw new AppError("Authorization code missing", 400);
        }

        // Exchange authorization code
        const { tokens } = await googleClient.getToken(code);

        if (!tokens.id_token) {
            throw new AppError("Google ID token not received", 401);
        }

        // Verify Google ID token
        const ticket = await googleClient.verifyIdToken({
            idToken: tokens.id_token,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();

        if (
            !payload?.sub ||
            !payload.email ||
            !payload.email_verified
        ) {
            throw new AppError("Unable to verify Google account", 401);
        }

        // Extract Google user information
        const googleUser = {
            googleId: payload.sub,
            email: payload.email,
            name: payload.name ?? ""
        };

        // Call authentication service
        const result = await googleAuthService(googleUser, userType);

        // Set refresh token cookie
        res.cookie("refreshToken", result.refresh_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 24 * 60 * 60 * 1000,
            path: "/api/users"
        });

        const { refresh_token, ...safeResult } = result;

        return res.status(200).json({
            message: "Google authentication successful",
            ...safeResult
        });

    } catch (error) {
        next(error);
    }
};