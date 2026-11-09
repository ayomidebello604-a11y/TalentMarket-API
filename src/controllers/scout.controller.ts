import type { Request, Response, NextFunction } from "express";
import { 
    getAllscoutsService, 
    createScoutService, 
    getScoutByIdService, 
    updateScoutContactdetailsService,
    deleteScoutService
} from "../services/scout.service.ts";
import { fetchScoutById } from "../repositories/scout.prisma.repository.ts";

export const getAllScouts = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const scouts = await getAllscoutsService();
        res.status(200).json({
            status: "success",
            scouts: scouts
        });
    } catch (error) {
        next(error);
    }
};

export const createScout = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const scoutId = req.userId;
        const userRole = req.userRole;

        if (userRole && userRole !== "scout" && userRole !== "admin") {
            return res.status(403).json({ message: "Only users registered as scouts can create a scout profile" });
        }

        const existingScout = await fetchScoutById(scoutId);
        if (existingScout) {
            return res.status(409).json({ message: "Scout profile already exists" });
        }

        const { contactDetails } = req.validatedScoutInput;
        const scout = await createScoutService(scoutId, contactDetails);
        res.status(201).json({
            status: "success",
            scout: scout
        });
    } catch(error) {
        next(error);
    }
};

export const getScoutById = async (req: Request<{ scoutId: string }>, res: Response, next: NextFunction) => {
    try {
        const scoutId = req.params.scoutId;
        const scout = await getScoutByIdService(scoutId);
        res.status(200).json({
            status: "success",
            scout: scout
        });
    } catch(error) {
        next(error);
    }
};

export const updateScoutContactDetails = async (req: Request<{ scoutId: string }>, res: Response, next: NextFunction) => {
    try { 
        const scoutId = req.params.scoutId;
        const userRole = req.userRole ?? "user";
        const loggedInUserId = req.userId;

        if (!loggedInUserId) {
            return res.status(401).json({ message: "Authentication required" });
        }

        // Only admin or the scout themselves can update the profile
        if (userRole !== "admin" && scoutId !== loggedInUserId) {
            return res.status(403).json({ message: "You can only update your own scout profile" });
        }

        const { contactDetails } = req.validatedScoutInput;
        const updatedScout = await updateScoutContactdetailsService(scoutId, contactDetails);
        if (!updatedScout) {
            return res.status(404).json({ message: "Scout profile not found" });
        }

        res.status(200).json({
            status: "success",
            scout: updatedScout
        });
    } catch(error) {
        next(error);
    }
};


export const deleteScout = async (req: Request<{ scoutId: string }>, res: Response, next: NextFunction) => {
    try {
        const scoutId = req.params.scoutId;
        const loggedInUserId = req.userId;

        if (!loggedInUserId) {
            return res.status(401).json({ message: "Authentication required" });
        }


        await deleteScoutService(scoutId);
        res.status(200).json({
            status: "success",
            message: "Scout profile deleted successfully"
        });
    } catch(error) {
        next(error);
    }
};                      