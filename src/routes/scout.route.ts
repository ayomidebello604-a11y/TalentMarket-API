import {Router} from "express";
import { getAllScouts, createScout, getScoutById, updateScoutContactDetails, deleteScout } from "../controllers/scout.controller.ts";
import { validatedScoutInput } from "../middlewares/scout.validation.ts";
import { authorizeRoles, verifyUserToken } from "../middlewares/auth.validation.ts";

const router = Router();

router.use(verifyUserToken); 

router.get("/", getAllScouts);
router.post("/", validatedScoutInput, createScout);
router.get("/:scoutId", getScoutById);
router.put("/:scoutId", validatedScoutInput, updateScoutContactDetails);
router.delete("/:scoutId", authorizeRoles("admin","scout"), deleteScout);

export default router;
