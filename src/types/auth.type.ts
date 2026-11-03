import type {RegisterType,LoginType} from "../schemas/auth.schema.ts";


export type RegisterReturnType = Omit<RegisterType, "password"> & {
    user_id: string;
};