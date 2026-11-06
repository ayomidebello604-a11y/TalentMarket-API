import { findUserById } from "../repositories/auth.repository.ts";
import { getPlayerProfileById } from "../repositories/player.repository.ts";
import { AppError } from "../errors/AppError.ts";
import { addPlayerToScout,getAllScoutPlayers,getAllScoutsForPlayer,removePlayerFromScout } from "../repositories/scout-player.repository.ts";


export const getScoutedPlayersService = async (scoutId: string) => {
    const players = await getAllScoutPlayers(scoutId);
  if ( players.length === 0) {
    throw new AppError("No players found for this scout", 404);
  }
    return players;
}



export const scoutPlayerService = async (scoutId: string, playerId: string) => {
const scout = await findUserById(scoutId);
if (!scout || scout.user_type !== "scout") {
    throw new AppError("Scout not found or user is not a scout", 404);
}
const player = await findUserById(playerId);
if (!player || player.user_type !== "player") {
    throw new AppError("Player not found or user is not a player", 404);
}
const playerProfile = await getPlayerProfileById(playerId);
if (!playerProfile) {
    throw new AppError("Player profile not found", 404);
}
const scoutingDetails = await addPlayerToScout(scoutId, playerId);
if (!scoutingDetails) {
    throw new AppError("You are already scouting this player", 409);
}
return scoutingDetails;
}



export const getScoutsForPlayerService = async (playerId: string) => {
    const scouts = await getAllScoutsForPlayer(playerId);
  if (!scouts || scouts.length === 0) {
    throw new AppError("No scouts found for this player", 404);
  }
    return scouts;
}

export const deletePlayerFromScoutService = async (scoutId: string, playerId: string) => {
    const scout = await findUserById(scoutId);
    if (!scout || scout.user_type !== "scout") {
        throw new AppError("Scout not found or user is not a scout", 403);
    }
    const player = await findUserById(playerId);
    if (!player || player.user_type !== "player") {
        throw new AppError("Player not found or user is not a player", 404);
    }
    const result = await removePlayerFromScout(scoutId, playerId);
    if (!result) {
        throw new AppError("Player not found in scout's list", 404);
    }
  return result;
}
