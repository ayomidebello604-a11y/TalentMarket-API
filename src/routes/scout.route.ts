import {Router} from "express";
import { getAllScouts, createScout, getScoutById, updateScoutContactDetails } from "../controllers/scout.controller.ts";
import { validatedScoutInput } from "../middlewares/scout.validation.ts";
import { verifyUserToken } from "../middlewares/auth.validation.ts";

const router = Router();

router.use(verifyUserToken); 

router.get("/", getAllScouts);
router.post("/", validatedScoutInput, createScout);
router.get("/:scoutId", getScoutById);
router.put("/:scoutId", validatedScoutInput, updateScoutContactDetails);

export default router;
