import type { Request, Response,NextFunction } from "express";
import { LoginUserService, registerUserService, updateUserService,deleteUserService } from "../services/auth.service.ts";

export const registerUser = async (req: Request, res: Response, next: NextFunction) =>  {
    try{
        const input = req.validatedRegisterBody;
        const newUser = await registerUserService(input);
        res.status(201).json({
            message: "User registered successfully",
            newUser
        });
    } catch(error) {
        next(error)
    }
}


export const LoginUser = async (req: Request, res: Response, next: NextFunction) => {
    try{
         const input = req.validatedLoginBody;
         const loginResult = await LoginUserService(input.email, input.password);
         res.status(200).json({
             message: "User logged in successfully",
             ...loginResult
         });
    } catch(error) {
        next(error)
    }
}


export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
    try{
        const { name, email } = req.body;
        const userId = req.userId;
        const updatedUser = await updateUserService(name, email, userId);
        res.status(200).json({
            message: "User updated successfully",
            updatedUser
        });
    } catch(error) {
        next(error)
    }
}

export const deleteUser = async (req: Request<{id: string}>, res: Response, next: NextFunction) => {
    try{
        const userId = req.params.id;
        await deleteUserService(userId);
        res.status(200).json({
            message: "User deleted successfully"
        });
    } catch(error) {
        next(error)
    }
}

