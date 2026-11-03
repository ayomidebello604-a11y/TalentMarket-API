import type {RegisterType,LoginType} from "../schemas/auth.schema.ts";
declare global {
    namespace Express {
  interface Request {
    validatedRegisterBody: RegisterType;
  }
    } }

    declare global {
    namespace Express {
  interface Request {
    validatedLoginBody:  LoginType;
  }
    } }

     declare global {
    namespace Express {
  interface Request {
    userId:  string;
  }
    } }

 declare global {
    namespace Express {
  interface Request {
    userRole: string;
  }
    } }
export {};