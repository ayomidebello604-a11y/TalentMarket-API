import type { Request, Response, NextFunction } from "express";
import { deletePlayerFromScoutService, getScoutedPlayersService,getScoutsForPlayerService,scoutPlayerService } from "../services/scout-player.service.ts";


export const getScoutedPlayers = async (req: Request, res: Response, next: NextFunction) => {
    try{
        const scoutId = req.userId;
        const scoutedPlayers = await getScoutedPlayersService(scoutId);
        return res.status(200).json({ players: scoutedPlayers });
    } catch(error) {
        next(error);
    }
}

export const scoutPlayer = async (req: Request<{ playerId: string }>, res: Response, next: NextFunction) => {
    try{
        const scoutId = req.userId;
        const playerId = req.params.playerId;
        const scoutingDetails = await scoutPlayerService(scoutId, playerId);
        if(!scoutingDetails) {
            return res.status(404).json({ message: "Scouting failed" });
        }
        return res.status(201).json({ message: "Player scouted successfully", scoutingDetails });
    } catch(error) {
        next(error)
    }
}

export const getScoutsForPlayer = async (req: Request<{ playerId: string }>, res: Response, next: NextFunction) => {
    try {
        const playerId = req.params.playerId;
        if (!playerId) {
            return res.status(404).json({ message: "Unable to find Player" });
        }
        const scouts = await getScoutsForPlayerService(playerId);
        if (!scouts || scouts.length === 0) {
            return res.status(404).json({ message: "No scouts found for this player" });
        }
        return res.status(200).json({ scouts });
    } catch (error) {
        next(error);
    }
};

export const deletePlayerFromScout = async (req: Request<{ playerId: string }>, res: Response, next: NextFunction) => {
    try {
        const scoutId = req.userId;
        const playerId = req.params.playerId;
        if (!playerId) {
            return res.status(404).json({ message: "Unable to find Player" });
        }
        const result = await deletePlayerFromScoutService(scoutId, playerId);
        if (!result) {
            return res.status(400).json({ message: "Failed to remove player from scout's list" });
        }
        return res.status(200).json({ message: "Player removed from scout's list", result });
    } catch (error) {
        next(error);
    }
};
