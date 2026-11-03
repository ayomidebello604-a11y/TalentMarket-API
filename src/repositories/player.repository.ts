import type { playerInput } from "../schemas/user.schema.ts"
type PlayerProfileReturnType = {
    playerId: string,
    position:string,
    ratings:number,
    contactDetails:string,
}
export const createPlayerProfile = async (playerId:string,input:playerInput): Promise<> =>  {
    const text = "INSERT INTO player_profiles (playerId, position, ratings, contact_details) VALUES ($1, $2, $3, $4) RETURNING *";
}