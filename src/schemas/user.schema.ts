import * as z from "zod";

export const createPlayerProfileSchema = z.object({
    position: z.enum(["gk", "def", "mid", "fwd"]),
    ratings: z.number().int().min(49).max(100),
    contactDetails: z.string().trim().min(11).max(30)
});

export const updatePlayerProfileSchema = createPlayerProfileSchema.partial();

export type playerInput = z.infer<typeof createPlayerProfileSchema>;
export type updatePlayerInput = z.infer<typeof updatePlayerProfileSchema>;



export const createScoutProfileSchema = z.object({
    contactDetails: z.string().trim().min(11).max(30)
})


export type scoutInput = z.infer<typeof createScoutProfileSchema>;

