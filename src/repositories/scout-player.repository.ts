import {pool} from "../config/database.ts"


export const addPlayerToScout = async(scoutId:string, playerId:string) => {
    const text = "INSERT INTO scout_players (scout_id, player_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING *";
    const values = [scoutId, playerId];
    const result = await pool.query(text, values);
    return result.rows[0];
}

export const getAllScoutPlayers = async (scoutId: string): Promise<{player_id: string}[]> => {
    const text = "SELECT player_id FROM scout_players WHERE scout_id = $1";
    const values = [scoutId];
    const result = await pool.query<{player_id: string}>(text, values);
    return result.rows;
}

export const getAllScoutsForPlayer = async (playerId: string): Promise<{scout_id: string}[]> => {
    const text = "SELECT scout_id FROM scout_players WHERE player_id = $1";
    const values = [playerId];
    const result = await pool.query<{scout_id: string}>(text, values);
    return result.rows;
};

export const removePlayerFromScout = async (scoutId: string, playerId: string): Promise<{player_id: string} | null> => {
    const text = "DELETE FROM scout_players WHERE scout_id = $1 AND player_id = $2 RETURNING *";
    const values = [scoutId, playerId];
    const result = await pool.query<{player_id: string}>(text, values);
    return result.rows[0];
}