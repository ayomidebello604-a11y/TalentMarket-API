import {hashPassword,verifyPassword} from "../utils/password.ts";
import {registerUser,  findUserByEmail, updateUser,removeUser,putSessionInfo,revokeToken,searchToken,findUserById,rotateRefreshToken} from "../repositories/auth.repository.ts";
import { RegisterType } from "../schemas/auth.schema.ts";
import { generateToken } from "../utils/jwt.ts";
import {randomUUID,createHash,randomBytes} from "node:crypto";
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
export const updateUserService = async (name: string, email: string,userId: string) => {
    const updatedUser = await updateUser(name, email,userId);  
    if (!updatedUser) {
        throw new AppError("User not found", 404);
    }
    const { password_hash: _, ...safeUser } = updatedUser;
    return safeUser;     
}

export const deleteUserService = async (userId: string) => {
    await removeUser(userId);
}


export const LoginUserService = async (email: string, password: string) => {
    const user = await findUserByEmail(email);
    if (!user) {
        throw new AppError("User not found",404);
    }
    const password_hash = user.password_hash;
    const isValidPassword = await verifyPassword(password_hash, password);
    if (!isValidPassword) {
        throw new AppError("Invalid email or password",401);
    }
     
    const role = user.user_type || user.role;
    const access_token = await generateToken(user.user_id, role);

    const sessionId = randomUUID();
    const refresh_Token = randomBytes(32).toString("hex");
    const refreshTokenHash = createHash("sha256").update(refresh_Token).digest("hex");
    const expires_at = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000); //24 hours from now
     const sessionInfo = {
        session_id: sessionId,
        user_id: user.user_id,
        token_hash: refreshTokenHash,
        expires_at: expires_at
    }
    await putSessionInfo(sessionInfo); 
   

    const { password_hash: _, ...safeUser } = user;

    const user_details = {
        user: {
            ...safeUser,
            role
        },
       access_token: access_token,
        refresh_token: refresh_Token,
    };
    return user_details;
}

export const logoutUserService = async (refresh_Token: string) => {
    const token_hash = createHash("sha256").update(refresh_Token).digest("hex");
    const isLogout = await revokeToken(token_hash);
    if (!isLogout) {
        throw new AppError("Logout failed", 500);
    }
    return { message: "Logout successful",
        expiredSessionId: isLogout
     };
};

export const verifyTokenService = async (refresh_Token: string) => {
  const token_hash = createHash("sha256").update(refresh_Token).digest("hex");
  const tokenInfo = await searchToken(token_hash);
  if (!tokenInfo) {
      throw new AppError("Invalid or expired refresh token", 401);
  }
   const  user_id = tokenInfo.user_id;
   const session_id = tokenInfo.session_id;
   const user = await findUserById(user_id);
   const role = user.user_type || "player";
    const  new_access_token = await generateToken(user_id, role);
    const new_refresh_Token = randomBytes(32).toString("hex");
    const new_refreshTokenHash = createHash("sha256").update(new_refresh_Token).digest("hex");
    const new_expires_at = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000); //24 hours from now
     await rotateRefreshToken(
    token_hash,
    new_refreshTokenHash,
    new_expires_at
);
const new_sessionInfo = {
    session_id: session_id,
    user_id: user_id,
    access_token: new_access_token,
   refreshToken: new_refresh_Token,
    expires_at: new_expires_at
}
return new_sessionInfo;

}



