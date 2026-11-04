import {pool} from "../config/database.ts";
import type {RegisterType} from "../schemas/auth.schema.ts";
import type {RegisterReturnType} from "../types/auth.type.ts";

type RegisterUserInput = Omit<RegisterType, "password"> & {
    password_hash: string;
};
 type FindUserByEmailReturnType = {
    user_id: string;
    email: string;
    password_hash: string;
    role: string;
};
type FindUserByIdReturnType = {
    userId: string, 
    name: string,
    email:string,
    userType: "player" | "scout"
}

export const registerUser = async (user: RegisterUserInput): Promise<RegisterReturnType> => {
    const {name, email, password_hash, userType} = user;
    const text = "INSERT INTO users (name, email, password_hash, user_type) VALUES ($1, $2, $3, $4) RETURNING *";
    const values = [name, email, password_hash, userType];
    const result = await pool.query<RegisterReturnType>(text, values);
    return result.rows[0];
};

export const findUserByEmail = async (
    email: string,
): Promise<FindUserByEmailReturnType | null> => {
    const text = 'SELECT * FROM users WHERE email = $1';
    const values = [email];
    const result = await pool.query<FindUserByEmailReturnType>(text, values);
    return result.rows[0] || null;
};

export const findUserById = async (id:string) : Promise<FindUserByIdReturnType> => {
    const text = "SELECT user_id, name, email, user_type FROM users WHERE user_id =$1"
    const value = [id]
    const result = await pool.query<FindUserByIdReturnType>(text,value)
    return result.rows[0]
}


export const updateUser = async (name: string, email: string,userId: string) : Promise<FindUserByEmailReturnType | null> => { 
    const text = "UPDATE users SET name = $1, email =$2, WhHERE user_id=$3 RETURNING *";
    const values = [name, email, userId];
    const result = await pool.query<FindUserByEmailReturnType>(text, values);
    return result.rows[0] || null;
}

export const removeUser = async (userId: string): Promise<void> => {
    const text = "DELETE FROM users WHERE user_id = $1";
    const values = [userId];
    await pool.query(text, values);
}
