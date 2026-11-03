import {hashPassword,verifyPassword} from "../utils/password.ts";
import {registerUser,  findUserByEmail, updateUser,removeUser} from "../repositories/auth.repository.ts";
import { RegisterType } from "../schemas/auth.schema.ts";
import { generateToken } from "../utils/jwt.ts";
import { AppError } from "../errors/AppError.ts";



export const registerUserService = async (user:RegisterType) => {
    const password_hash = await hashPassword(user.password);
    const inputs =  {
     name: user.name,
     email: user.email,
     password_hash: password_hash,
     userType: user.userType
    }
    const newUser = await registerUser(inputs);
    if(!newUser){
        throw new AppError("User registration failed",500);
    }
    return newUser;
}

export const LoginUserService = async (email: string, password: string) => {
const user = await findUserByEmail(email);
if (!user) {
    throw new AppError("User not found",404);
}
const password_hash = user.password_hash
const isValidPassword = await verifyPassword(password_hash, password);
if (!isValidPassword) {
    throw new AppError("Invalid password",401);
}

const access_token = await generateToken(user.user_id,user.role)

const user_details = {
    user,
   access_token
}
return user_details;
}


export const updateUserService = async (name: string, email: string,userId: string) => {
    const updatedUser = await updateUser(name, email,userId);  
    if (!updatedUser) {
        throw new AppError("User not found", 404);
    }
    return updatedUser;     
}
export const deleteUserService = async (userId: string) => {
    await removeUser(userId);
}