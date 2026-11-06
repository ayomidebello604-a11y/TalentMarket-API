import { Router } from "express";
import { authorizeRoles, verifyUserToken } from "../middlewares/auth.validation.ts";
import { 
    validatePlayerInput, 
    validatingUpdatePlayerInput 
} from "../middlewares/player.validation.ts";
import { 
    getAllPlayers, 
    createPlayerProfile, 
    getPlayerByName,
    getPlayersByPosition,
    updatePlayerProfile, 
    deletePlayerProfile 
} from "../controllers/player.controller.ts";

const playerRouter = Router();

playerRouter.use(verifyUserToken);

playerRouter.get("/", getAllPlayers);
playerRouter.post("/", validatePlayerInput, createPlayerProfile);
playerRouter.get("/name", getPlayerByName);
playerRouter.get("/position", getPlayersByPosition);
playerRouter.put("/", validatingUpdatePlayerInput, updatePlayerProfile);
playerRouter.delete("/", authorizeRoles("admin","player"), deletePlayerProfile);

export default playerRouter;
