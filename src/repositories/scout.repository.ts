import { pool } from "../config/database.ts";

export type createScoutReturnType = {
    scout_id: string;
    contact_details: string;
    name?: string;
    email?: string;
};

export const fetchAllScouts = async (): Promise<createScoutReturnType[]> => {
    const result = await pool.query<createScoutReturnType>("SELECT * FROM scouts");
    const scouts = result.rows;

    const scoutsWithUser = await Promise.all(
        scouts.map(async (scout) => {
            const userText = "SELECT name, email FROM users WHERE user_id = $1";
            const userResult = await pool.query<{ name: string; email: string }>(userText, [scout.scout_id]);
            const user = userResult.rows[0];
            return {
                ...scout,
                name: user ? user.name : undefined,
                email: user ? user.email : undefined,
            };
        })
    );

    return scoutsWithUser;
};

export const createScoutProfile = async (scoutId: string, contactDetails: string): Promise<createScoutReturnType> => {
    const text = "INSERT INTO scouts (scout_id, contact_details) VALUES ($1, $2) RETURNING *";
    const value = [scoutId, contactDetails];
    const result = await pool.query<createScoutReturnType>(text, value);
    return result.rows[0];
};

export const fetchScoutById = async (scoutId: string): Promise<createScoutReturnType | null> => {
    const text = "SELECT * FROM scouts WHERE scout_id = $1";
    const value = [scoutId];
    const result = await pool.query<createScoutReturnType>(text, value);
    const scout = result.rows[0];
    if (!scout) return null;

    const userText = "SELECT name, email FROM users WHERE user_id = $1";
    const userResult = await pool.query<{ name: string; email: string }>(userText, [scoutId]);
    const user = userResult.rows[0];

    return {
        ...scout,
        name: user ? user.name : undefined,
        email: user ? user.email : undefined,
    };
};

export const updateScout = async (contactDetails: string, scoutId: string): Promise<createScoutReturnType | null> => {
    const text = "UPDATE scouts SET contact_details = $1 WHERE scout_id = $2 RETURNING *";
    const value = [contactDetails, scoutId];
    const result = await pool.query<createScoutReturnType>(text, value);
    return result.rows[0] ?? null;
};
