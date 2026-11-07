import { randomUUID, randomBytes, createHash } from "node:crypto";
import { AppError } from "../errors/AppError.ts";

import {
    findUserByGoogleId,
    findUserByEmail,
    createGoogleUser,
    putSessionInfo
} from "../repositories/auth.repository.ts";

import { generateToken } from "../utils/jwt.ts";

type GoogleUserInput = {
    googleId: string;
    email: string;
    name: string;
};

type UserType = "player" | "scout";

export const googleAuthService = async (
    googleUser: GoogleUserInput,
    userType?: UserType
) => {

    // 1. Check whether this Google account already exists
    let user = await findUserByGoogleId(googleUser.googleId);

    // 2. Register new Google user if necessary
    if (!user) {

        const existingUser = await findUserByEmail(googleUser.email);

        // Prevent automatic linking to an existing account
        if (existingUser) {
            throw new AppError(
                "An account with this email already exists. Please log in using your existing method.",
                409
            );
        }

        if (!userType) {
            throw new AppError("Please select whether you are a player or scout", 400);
        }

        user = await createGoogleUser({
            name: googleUser.name || googleUser.email.split("@")[0],
            email: googleUser.email,
            google_id: googleUser.googleId,
            user_type: userType
        });
    }

    if (!user) {
        throw new AppError("Google authentication failed", 500);
    }

    // 3. Generate application access token
    const access_token = await generateToken(
        user.user_id,
        user.role
    );

    // 4. Generate refresh token
    const session_id = randomUUID();

    const refresh_token = randomBytes(32).toString("hex");

    const token_hash = createHash("sha256")
        .update(refresh_token)
        .digest("hex");

    // 5. Set refresh token expiry (24 hours)
    const expires_at = new Date(
        Date.now() + 24 * 60 * 60 * 1000
    );

    // 6. Store session information
    await putSessionInfo({
        session_id,
        user_id: user.user_id,
        token_hash,
        expires_at
    });

    // 7. Remove sensitive information
    const {
        password_hash: _,
        ...safeUser
    } = user;

    // 8. Return authentication details
    return {
        user: safeUser,
        access_token,
        refresh_token,
        session_id,
        user_id: user.user_id,
        expires_at
    };
};