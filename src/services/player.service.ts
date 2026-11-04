import { 
    getAllProfile, 
    createPlayerProfile, 
    getPlayerProfileById, 
    getPlayerProfileByName,
    getPlayersByPosition,
    updatePlayerProfile, 
    deletePlayerProfile 
} from "../repositories/player.repository.ts";
import type { playerInput, updatePlayerInput } from "../schemas/user.schema.ts";

export const getAllPlayersService = async () => {
    return await getAllProfile();
};

export const createPlayerProfileService = async (playerId: string, input: playerInput) => {
    return await createPlayerProfile(playerId, input);
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
    return await updatePlayerProfile(input, playerId);
};

export const deletePlayerProfileService = async (role: string, playerId: string, userId?: string) => {
    return await deletePlayerProfile(role, playerId, userId);
};
