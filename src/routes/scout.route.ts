import {Router} from "express";
import { getAllScouts, createScout, getScoutById, updateScoutContactDetails, deleteScout } from "../controllers/scout.controller.ts";
import { validatedScoutInput } from "../middlewares/scout.validation.ts";
import { authorizeRoles, verifyUserToken } from "../middlewares/auth.validation.ts";
import { validateUuidParams } from "../middlewares/uuid.validation.ts";

const router = Router();

router.use(verifyUserToken); 

router.get("/", getAllScouts);
router.post("/", validatedScoutInput, createScout);
router.get("/:scoutId", validateUuidParams("scoutId"), getScoutById);
router.put("/:scoutId", validateUuidParams("scoutId"), validatedScoutInput, updateScoutContactDetails);
router.delete("/:scoutId", authorizeRoles("admin","scout"), validateUuidParams("scoutId"), deleteScout);

export default router;