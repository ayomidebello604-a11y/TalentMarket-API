import {SignJWT, jwtVerify} from "jose";


const secret = new TextEncoder().encode(process.env.JWT_SECRET);
export const generateToken = async (userId:string, role: string) => {
const token = await new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("20m")
    .sign(secret);
    return token;
}
