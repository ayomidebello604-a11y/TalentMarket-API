import { findUserById } from "../repositories/auth.repository.ts"
import { createScoutProfile, fetchAllScouts,fetchScoutById } from "../repositories/scout.repository.ts"



export const getAllscouts = async() => {
  const result =  await fetchAllScouts()
     return result
}

export const createScoutService = async (scoutId:string,contactDetails:string) => {
    const result =   await createScoutProfile(scoutId,contactDetails)
    return result;
}

export const getScoutById = async (scoutId: string) => {
const scout = await fetchScoutById(scoutId)
const id = scout.scoutId
const scoutDetails = scout.contactDetails
const user_scout = await findUserById(id)
const scoutReturn = {
    user_scout,
    scoutDetails
}
return scoutReturn
}


