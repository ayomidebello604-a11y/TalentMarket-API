import {Router } from "express";
import { registerUser, LoginUser, updateUser, deleteUser } from "../controllers/auth.controller.ts";
import { validateRegisterBody, validateLoginBody, verifyUserToken } from "../middlewares/auth.validation.ts";

const route = Router();


route.post("/register", validateRegisterBody, registerUser);
route.post("/login", validateLoginBody, LoginUser);
route.put("/update", verifyUserToken, updateUser)
route.delete("/:id", verifyUserToken, deleteUser)


export default route;