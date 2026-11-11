import { 
    getAllProfile, 
    createPlayerProfile, 
    getPlayerProfileById, 
    getPlayerProfileByName,
    getPlayersByPosition,
    updatePlayerProfile, 
    deletePlayerProfile 
} from "../repositories/player.repository.ts";
import { Redis } from "../config/redis.ts";
import type { playerInput, updatePlayerInput } from "../schemas/user.schema.ts";




export const getAllPlayersService = async () => {
    const CACHE_KEY = "talentmarket:players:all"
    const CACHED_PLAYERS = await Redis.get(CACHE_KEY)
    if(CACHED_PLAYERS) {
      return JSON.parse(CACHED_PLAYERS)
    }
    const allPlayers =  await getAllProfile();
       await Redis.setEx(CACHE_KEY,3600,JSON.stringify(allPlayers))
    return allPlayers
};

export const createPlayerProfileService = async (playerId: string, input: playerInput) => {
    const player = await createPlayerProfile(playerId, input);
    if(player)  await Redis.del("talentmarket:players:all")
        return player
};

export const getPlayerByIdService = async (playerId: string) => {
    return await getPlayerProfileById(playerId);
};

export const getPlayerByNameService = async (name: string) => {
    return await getPlayerProfileByName(name);
};

export const getPlayersByPositionService = async (position: string) => {
    return await getPlayersByPosition(position);
};

export const updatePlayerProfileService = async (input: updatePlayerInput, playerId: string) => {
    const updatedPlayer = await updatePlayerProfile(input, playerId);
    if(updatedPlayer) await Redis.del("talentmarket:players:all")
        return updatedPlayer
};

export const deletePlayerProfileService = async (role: string, playerId: string, userId?: string) => {
  const deletedPlayer = await deletePlayerProfile(role, playerId, userId);
  if(deletedPlayer) await Redis.del("talentmarket:players:all")
    return deletedPlayer
};
