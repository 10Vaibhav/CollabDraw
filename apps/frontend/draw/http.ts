import axios from "axios"
import { HTTP_BACKEND } from "../config";
import { Shape } from "./Game";


export async function getExistingShapes(documentId: number): Promise<(Shape & { id: number })[]> {
  console.log("docs id", documentId);
  try {
    const response = await axios.get(`${HTTP_BACKEND}/elements/${documentId}`, {
      withCredentials: true, // important for sending the cookie
    });

    return response.data.elements as (Shape & { id: number })[];
  } catch (error) {
    console.error("Error fetching shapes:", error);
    return [];
  }
}

export async function deleteShapesByIds(ids: number[]): Promise<void> {
  try {
    if (!Array.isArray(ids)) {
      throw new Error("IDs should be an array.");
    }

    await axios.delete(`${HTTP_BACKEND}/element`, {
      withCredentials: true,
      data: { ids },
    });

    console.log(`Elements with IDs ${ids.join(", ")} deleted successfully.`);
  } catch (error) {
    console.error("Error deleting elements:", error);
  }
}
