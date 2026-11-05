import { pool } from "../config/database.ts";
import type { playerInput, updatePlayerInput } from "../schemas/user.schema.ts";

export type PlayerProfileReturnType = {
    player_id: string;
    position: string;
    ratings: number;
    contact_details: string;
    name?: string;
    email?: string;
};

export const getAllProfile = async (): Promise<PlayerProfileReturnType[]> => {
    const text = "SELECT * FROM players ORDER BY ratings DESC";
    const result = await pool.query<PlayerProfileReturnType>(text);

    const playersWithUser = await Promise.all(
        result.rows.map(async (player) => {
            const userText = "SELECT name, email FROM users WHERE user_id = $1";
            const userResult = await pool.query<{ name: string; email: string }>(userText, [player.player_id]);
            const user = userResult.rows[0];
            return {
                ...player,
                name: user ? user.name : undefined,
                email: user ? user.email : undefined,
            };
        })
    );

    return playersWithUser;
};

export const createPlayerProfile = async (
    playerId: string,
    input: playerInput
): Promise<PlayerProfileReturnType> => {
    const { position, ratings, contactDetails } = input;
    const text = "INSERT INTO players (player_id, position, ratings, contact_details) VALUES ($1, $2, $3, $4) RETURNING *";
    const values = [playerId, position, ratings, contactDetails];
    const result = await pool.query<PlayerProfileReturnType>(text, values);
    return result.rows[0];
};

export const getPlayerProfileById = async (playerId: string): Promise<PlayerProfileReturnType | null> => {
    const text = "SELECT * FROM players WHERE player_id = $1";
    const values = [playerId];
    const result = await pool.query<PlayerProfileReturnType>(text, values);
    const player = result.rows[0];
    if (!player) return null;

    const userText = "SELECT name, email FROM users WHERE user_id = $1";
    const userResult = await pool.query<{ name: string; email: string }>(userText, [playerId]);
    const user = userResult.rows[0];

    return {
        ...player,
        name: user ? user.name : undefined,
        email: user ? user.email : undefined,
    };
};

export const getPlayerProfileByName = async (name: string): Promise<PlayerProfileReturnType | null> => {
    const userText = "SELECT user_id, name, email FROM users WHERE name ILIKE $1";
    const userResult = await pool.query<{ user_id: string; name: string; email: string }>(userText, [`%${name}%`]);
    const user = userResult.rows[0];
    if (!user) return null;

    const player = await getPlayerProfileById(user.user_id);
    if (!player) return null;

    return {
        ...player,
        name: user.name,
        email: user.email,
    };
};

export const getPlayersByPosition = async (position: string): Promise<PlayerProfileReturnType[]> => {
    const text = "SELECT * FROM players WHERE position = $1 ORDER BY ratings DESC";
    const values = [position];
    const result = await pool.query<PlayerProfileReturnType>(text, values);

    const playersWithUser = await Promise.all(
        result.rows.map(async (player) => {
            const userText = "SELECT name, email FROM users WHERE user_id = $1";
            const userResult = await pool.query<{ name: string; email: string }>(userText, [player.player_id]);
            const user = userResult.rows[0];
            return {
                ...player,
                name: user ? user.name : undefined,
                email: user ? user.email : undefined,
            };
        })
    );

    return playersWithUser;
};

export const updatePlayerProfile = async (
    input: updatePlayerInput,
    playerId: string
): Promise<PlayerProfileReturnType | null> => {
    const updates: string[] = [];
    const values: (string | number)[] = [];
    let paramIndex = 1;

    if (input.position !== undefined) {
        updates.push(`position = $${paramIndex++}`);
        values.push(input.position);
    }
    if (input.ratings !== undefined) {
        updates.push(`ratings = $${paramIndex++}`);
        values.push(input.ratings);
    }
    if (input.contactDetails !== undefined) {
        updates.push(`contact_details = $${paramIndex++}`);
        values.push(input.contactDetails);
    }

    if (updates.length === 0) {
        return getPlayerProfileById(playerId);
    }

    values.push(playerId);
    const text = `UPDATE players SET ${updates.join(", ")} WHERE player_id = $${paramIndex} RETURNING *`; 

    const result = await pool.query<PlayerProfileReturnType>(text, values);
    return result.rows[0] || null;
};

export const deletePlayerProfile = async (
    role: string,
    playerId: string,
    userId?: string
): Promise<PlayerProfileReturnType | null> => {
    if (role === "admin") {
        const text = "DELETE FROM players WHERE player_id = $1 RETURNING *";
        const values = [playerId];
        const result = await pool.query<PlayerProfileReturnType>(text, values);
        return result.rows[0] || null;
    }

    // If role is user, verify the playerId matches the userId from the token
    if (playerId !== userId) {
        return null;
    }

    const text = "DELETE FROM players WHERE player_id = $1 RETURNING *";
    const values = [userId];
    const result = await pool.query<PlayerProfileReturnType>(text, values);
    return result.rows[0] || null;
};
