import {Router } from "express";
import { getScoutedPlayers,scoutPlayer,getScoutsForPlayer, deletePlayerFromScout } from "../controllers/scout-player.controller.ts";
import { verifyUserToken,authorizeRoles } from "../middlewares/auth.validation.ts";


const route = Router();

route.use(verifyUserToken);

route.get("/", getScoutedPlayers);
route.post("/:playerId", scoutPlayer);
route.get("/:playerId/scouts", getScoutsForPlayer);
route.delete("/:playerId", authorizeRoles("admin","scout"), deletePlayerFromScout);

export default route;