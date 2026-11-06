import { AppError } from "../errors/AppError.ts";
import { findUserById } from "../repositories/auth.repository.ts";
import { 
    createScoutProfile, 
    fetchAllScouts, 
    fetchScoutById, 
    updateScout ,
    removeScout
} from "../repositories/scout.repository.ts";

export const getAllscoutsService = async () => {
    const result = await fetchAllScouts();
    return result;
};

export const createScoutService = async (scoutId: string, contactDetails: string) => {
    const result = await createScoutProfile(scoutId, contactDetails);
    return result;
};

export const getScoutByIdService = async (scoutId: string) => {
    const scout = await fetchScoutById(scoutId);
    if (!scout) {
        throw new AppError("Scout not found", 404);
    }
    const id = scout.scout_id;
    const scoutDetails = scout.contact_details;
    const user_scout = await findUserById(id);
    const scoutReturn = {
        user_scout,
        scoutDetails
    };
    return scoutReturn;
};

export const updateScoutContactdetailsService = async (scoutId: string, newContactDetails: string) => {
    const result = await updateScout(newContactDetails, scoutId);
    return result;
};

export const deleteScoutService = async (scoutId: string) => {
    const scout = await fetchScoutById(scoutId);
    if (!scout) {
        throw new AppError("Scout not found", 404);
    }
    await removeScout(scoutId);
}