import {Router } from "express";
import { getScoutedPlayers,scoutPlayer,getScoutsForPlayer, deletePlayerFromScout } from "../controllers/scout-player.controller.ts";
import { verifyUserToken,authorizeRoles } from "../middlewares/auth.validation.ts";
import { validateUuidParams } from "../middlewares/uuid.validation.ts";


const route = Router();

route.use(verifyUserToken);

route.get("/", getScoutedPlayers);
route.post("/:playerId", validateUuidParams("playerId"), scoutPlayer);
route.get("/:playerId/scouts", validateUuidParams("playerId"), getScoutsForPlayer);
route.delete("/:playerId", authorizeRoles("admin","scout"), validateUuidParams("playerId"), deletePlayerFromScout);

export default route;