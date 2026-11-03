import argon2 from "argon2";

 export const hashPassword = async (password: string): Promise<string> => {
    const hashed_password = await argon2.hash(password);
    return hashed_password;
}

export const verifyPassword = async (hashed_password: string, password: string): Promise<boolean> => {
    const isValid = await argon2.verify(hashed_password, password);
    return isValid;
}
