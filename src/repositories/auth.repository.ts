import { AppError } from "../errors/AppError.ts"
import {pool} from "../config/database.ts";
import type {RegisterType} from "../schemas/auth.schema.ts";
import type {RegisterReturnType} from "../types/auth.type.ts";
import { UUID } from "node:crypto";

type RegisterUserInput = Omit<RegisterType, "password"> & {
    password_hash: string;
};
type FindUserByEmailReturnType = {
    user_id: string;
    name: string;
    email: string;
    password_hash: string;
    user_type: string;
    role: string;
};
type FindUserByIdReturnType = {
    user_id: string,
    name: string,
    email: string,
    user_type: "player" | "scout"
}

type putSessionInfoInput = {
    session_id: string;
    user_id: string;
    token_hash: string;
    expires_at: Date;
};
type putSessionInfoReturnType =  Omit<putSessionInfoInput, "token_hash"> 
export interface token {
    user_id: string;
    session_id: string;
    token_hash: string;
}

export const registerUser = async (user: RegisterUserInput): Promise<RegisterReturnType> => {
    const {name, email, password_hash, userType} = user;
    const text = "INSERT INTO users (name, email, password_hash, user_type) VALUES ($1, $2, $3, $4) RETURNING *, user_type AS role";
    const values = [name, email, password_hash, userType];
    const result = await pool.query<RegisterReturnType>(text, values);
    return result.rows[0];
};

export const findUserByEmail = async (
    email: string,
): Promise<FindUserByEmailReturnType | null> => {
    const text = 'SELECT *, user_type AS role FROM users WHERE email = $1';
    const values = [email];
    const result = await pool.query<FindUserByEmailReturnType>(text, values);
    return result.rows[0] || null;
};

export const findUserById = async (id:string) : Promise<FindUserByIdReturnType> => {
    const text = "SELECT user_id, name, email, user_type FROM users WHERE user_id =$1"
    const value = [id]
    const result = await pool.query<FindUserByIdReturnType>(text,value)
    return result.rows[0]
}

export const updateUser = async (name: string, email: string,userId: string) : Promise<FindUserByEmailReturnType | null> => { 
    const text = "UPDATE users SET name = $1, email = $2 WHERE user_id = $3 RETURNING *, user_type AS role";
    const values = [name, email, userId];
    const result = await pool.query<FindUserByEmailReturnType>(text, values);
    return result.rows[0] || null;
}

export const removeUser = async (userId: string): Promise<void> => {
    const text = "DELETE FROM users WHERE user_id = $1";
    const values = [userId];
    await pool.query(text, values);
}

export const putSessionInfo = async (input:putSessionInfoInput) : Promise<putSessionInfoReturnType> => {
    const {session_id, user_id, token_hash, expires_at} = input;
    const text = "INSERT INTO refresh_tokens (session_id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4) RETURNING session_id, user_id, expires_at";
    const values = [session_id, user_id, token_hash, expires_at];
     const sessionInfo = await pool.query(text, values);
     return sessionInfo.rows[0];
}

export const searchToken = async ( token_hash: string): Promise<token | null> => {
  const text = "SELECT user_id,session_id,token_hash FROM refresh_tokens WHERE token_hash=$1 AND expires_at > NOW() AND revoked_at IS NULL";
  const value = [token_hash];
  const token_info = await pool.query<token>(text, value);
  return token_info.rows[0] ?? null;
};

export const revokeToken = async (token_hash: string): Promise<UUID | null> => {
    const text = "UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1 RETURNING session_id, user_id, token_hash, expires_at, revoked_at";
    const value = [token_hash];
    const result = await pool.query<{ session_id: UUID }>(text, value);
    return result.rows[0]?.session_id || null;
};


export const rotateRefreshToken = async (
    token_hash: string,
    hashed_refreshToken: string,
    expires_at: Date
): Promise<void> => {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const result = await client.query<
            token & {
                expires_at: Date;
                revoked_at: Date | null;
            }
        >(
            `SELECT user_id, session_id, token_hash, expires_at, revoked_at
             FROM refresh_tokens
             WHERE token_hash = $1
             FOR UPDATE`,
            [token_hash]
        );

        const oldToken = result.rows[0];

        if (!oldToken) {
            throw new AppError("Invalid refresh token", 401);
        }

        if (oldToken.revoked_at !== null) {
            throw new AppError("Refresh token has already been revoked", 401);
        }

        if (oldToken.expires_at.getTime() <= Date.now()) {
            throw new AppError("Refresh token has expired", 401);
        }

        await client.query(
            `UPDATE refresh_tokens
             SET revoked_at = NOW()
             WHERE token_hash = $1`,
            [token_hash]
        );

        await client.query(
            `INSERT INTO refresh_tokens
             (user_id, session_id, token_hash, expires_at)
             VALUES ($1, $2, $3, $4)`,
            [
                oldToken.user_id,
                oldToken.session_id,
                hashed_refreshToken,
                expires_at
            ]
        );

        await client.query("COMMIT");

    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};
