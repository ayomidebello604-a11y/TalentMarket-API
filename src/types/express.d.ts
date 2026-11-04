import type { RegisterType, LoginType } from "../schemas/auth.schema.ts";
import type { playerInput, updatePlayerInput, scoutInput } from "../schemas/user.schema.ts";

declare global {
  namespace Express {
    interface Request {
      validatedRegisterBody: RegisterType;
      validatedLoginBody: LoginType;
      userId: string;
      userRole: string;
      validatedPlayerInput: playerInput | updatePlayerInput;
      validatedScoutInput: scoutInput;
    }
  }
}

export {};
