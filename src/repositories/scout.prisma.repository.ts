import { prisma } from "../config/prisma.ts";

export type createScoutReturnType = {
    scout_id: string;
    contact_details: string;
    name?: string;
    email?: string;
};

export const fetchAllScouts = async (): Promise<createScoutReturnType[]> => {
    const scouts = await prisma.scouts.findMany({
        select: {
            scout_id: true,
            contact_details: true,
            users: {
                select: {
                    name: true,
                    email: true,
                },
            },
        },
    });
    return scouts.map(({ users, ...scout }) => ({
        ...scout,
        name: users.name,
        email: users.email,
    }));
};

export const createScoutProfile = async (
    scoutId: string,
    contactDetails: string,
): Promise<createScoutReturnType> => {
    const scout = await prisma.scouts.create({
        data: {
            scout_id: scoutId,
            contact_details: contactDetails,
        },
    });
    return scout;
};


export const fetchScoutById = async (
    scoutId: string,
): Promise<createScoutReturnType | null> => {
    const scout = await prisma.scouts.findUnique({
        where: {
            scout_id: scoutId,
        },
        select: {
            scout_id: true,
            contact_details: true,
            users: {
                select: {
                    name: true,
                    email: true,
                },
            },
        },
    });
    if (!scout) return null;

    const { users, ...scoutProfile } = scout;
    return {
        ...scoutProfile,
        name: users.name,
        email: users.email,
    };
};

export const updateScout = async (
    contactDetails: string,
    scoutId: string,
): Promise<createScoutReturnType | null> => {
    const [updatedScout] = await prisma.scouts.updateManyAndReturn({
        where: {
            scout_id: scoutId,
        },
        data: {
            contact_details: contactDetails,
        },
        select: {
            scout_id: true,
            contact_details: true,
        },
    });
    return updatedScout ?? null;
};

export const removeScout = async (scoutId: string): Promise<void> => {
    await prisma.scouts.deleteMany({
        where: {
            scout_id: scoutId,
        },
    });
};