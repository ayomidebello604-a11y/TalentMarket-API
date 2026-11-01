import * as z from "zod";
export const LoginSchema = z.object({
  email: z.email().nonempty(),
  password: z.string().trim().nonempty().min(8),
});

export const RegisterSchema = z.object({
    name: z.string().trim().nonempty().min(1),
    email: z.email().nonempty().max(30),
    password: z.string().trim().nonempty().min(8).max(50),
    userType: z.literal(["player", "scout"]),
})



export type  LoginType = z.infer<typeof LoginSchema>;
export type RegisterType = z.infer<typeof RegisterSchema>;