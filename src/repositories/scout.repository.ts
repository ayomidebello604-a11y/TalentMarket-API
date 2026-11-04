import {pool} from "../config/database.ts";


type createScoutReturnType = {
    scoutId: string,
    contactDetails: string
}


export const fetchAllScouts = async (): Promise<createScoutReturnType[]> => {
    const result =  await pool.query<createScoutReturnType[]>("SELECT * FROM scouts");
    return result.rows[0]
}

export const createScoutProfile = async (scoutId:string,contactDetails:string): Promise<createScoutReturnType> => {
    const text = "INSERT INTO scouts (scout_id, contact_details) VALUES ($1, $2)"
    const value = [scoutId,contactDetails]
    const result = await pool.query<createScoutReturnType>(text,value)
    return result.rows[0]
}

export const fetchScoutById = async (scoutId:string):Promise<createScoutReturnType> => {
  const text = "SELECT * FROM scouts WHERE scout_id = $1"
  const value = [scoutId]
  return (await pool.query<createScoutReturnType>(text,value)).rows[0]
}

export const updateScout = async ( contactDetails: string,scoutId:string):Promise<createScoutReturnType> => {
const text = "UPDATE scouts SET contact_details = $1 WHERE scout_id = $2"
const value = [contactDetails,scoutId]
const result = await pool.query<createScoutReturnType>(text,value)
return result.rows[0];
} 

