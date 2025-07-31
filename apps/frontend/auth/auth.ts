"use server"
import { cookies } from 'next/headers';

export async function getCookies() {
  const cookie = await cookies();
  const token = cookie.get("token")?.value
  if(token===undefined){return}
  return token.toString() ;
}