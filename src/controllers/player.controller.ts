import type { Request, Response, NextFunction } from "express";
import { 
    getAllPlayersService, 
    createPlayerProfileService, 
    getPlayerByIdService, 
    getPlayerByNameService,
    getPlayersByPositionService,
    updatePlayerProfileService, 
    deletePlayerProfileService 
} from "../services/player.service.ts";
import type { playerInput, updatePlayerInput } from "../schemas/user.schema.ts";

export const getAllPlayers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const players = await getAllPlayersService();
        res.status(200).json(players);
    } catch(error) {
        next(error);
    }
};

export const createPlayerProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const playerId = req.userId;
        const input = req.validatedPlayerInput as playerInput;

        const existingPlayer = await getPlayerByIdService(playerId);
        if (existingPlayer) {
            return res.status(409).json({ message: "Player profile already exists" });
        }

        const player = await createPlayerProfileService(playerId, input);
        if (!player) {
            return res.status(400).json({ message: "Failed to create player profile" });
        }
        res.status(201).json(player);
    } catch(error) {
        next(error);
    }
};

export const getPlayerByName = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const name = req.query.name as string;
        if (!name) {
            return res.status(400).json({ message: "Name query parameter is required" });
        }
        const player = await getPlayerByNameService(name);
        if (!player) {
            return res.status(404).json({ message: "Player not found" });
        }
        res.status(200).json(player);
    } catch(error) {
        next(error);
    }
};

export const getPlayersByPosition = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const position = req.query.position as string;
        if (!position) {
            return res.status(400).json({ message: "Position query parameter is required" });
        }
        const players = await getPlayersByPositionService(position);
        res.status(200).json(players);
    } catch(error) {
        next(error);
    }
};

export const updatePlayerProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const playerId = req.userId;    
        const input = req.validatedPlayerInput as updatePlayerInput;
        const player = await updatePlayerProfileService(input, playerId);
        if (!player) {
            return res.status(404).json({ message: "Player not found" });
        }
        res.status(200).json(player);
    } catch(error) {
        next(error);
    } 
};

export const deletePlayerProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userRole = req.userRole ?? "user";
        const loggedInUserId = req.userId;

        if (!loggedInUserId) {
            return res.status(401).json({ message: "Authentication required" });
        }

        // If admin, they can pass target playerId in query/body; otherwise, target is the logged-in user's own profile
        const targetPlayerId = (userRole === "admin" && (req.query.playerId as string || req.body?.playerId)) 
            ? ((req.query.playerId as string) || req.body?.playerId) 
            : loggedInUserId;

        // If role = user, verify against the userId from the access token
        if (userRole !== "admin" && targetPlayerId !== loggedInUserId) {
            return res.status(403).json({ message: "You can only delete your own player profile" });
        }

        const deletedPlayer = await deletePlayerProfileService(userRole, targetPlayerId, loggedInUserId);
        if (!deletedPlayer) {
            return res.status(404).json({ message: "Player profile not found" });
        }

        res.status(200).json({
            message: "Player profile deleted successfully",
            data: deletedPlayer,
        });
    } catch (error) {
        next(error);
    }
};
