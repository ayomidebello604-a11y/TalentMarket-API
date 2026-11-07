import {Router } from "express";
import { registerUser, LoginUser,googleAuthCallback, updateUser, deleteUser, logoutUser,  refreshToken, googleAuth } from "../controllers/auth.controller.ts";
import { validateRegisterBody, validateLoginBody, verifyUserToken, authorizeRoles } from "../middlewares/auth.validation.ts";
import { Loginlimiter, Registerlimiter } from "../config/security.ts";

const route = Router();


route.post("/register", Registerlimiter, validateRegisterBody, registerUser);
route.post("/login", Loginlimiter, validateLoginBody, LoginUser);
route.get("/google", googleAuth);
route.get("/google/callback", googleAuthCallback);
route.post("/logout", verifyUserToken, logoutUser);
route.put("/update", verifyUserToken, updateUser)
route.post("/refresh", refreshToken)
route.delete("/:id", verifyUserToken, authorizeRoles("admin"), deleteUser)


export default route;