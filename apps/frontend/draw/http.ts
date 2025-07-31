import axios from "axios"
import { HTTP_BACKEND } from "../config";
import { Shape } from "./Game";

// Retry mechanism utility
async function retryRequest<T>(
  requestFn: () => Promise<T>,
  maxRetries: number = 2,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error as Error;
      console.warn(`Attempt ${attempt}/${maxRetries} failed:`, error);
      
      if (attempt === maxRetries) {
        break;
      }
      
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
  
  throw lastError!;
}

export async function getExistingShapes(documentId: number): Promise<(Shape & { id: number })[]> {
  console.log("Fetching shapes for document ID:", documentId);
  console.log("Backend URL:", `${HTTP_BACKEND}/elements/${documentId}`);
  
  try {
    // Validate documentId
    if (!documentId || documentId <= 0 || isNaN(documentId)) {
      console.warn("Invalid document ID provided:", documentId);
      return [];
    }

    return await retryRequest(async () => {
      const response = await axios.get(`${HTTP_BACKEND}/elements/${documentId}`, {
        withCredentials: true,
        timeout: 10000, // 10 second timeout
        headers: {
          'Content-Type': 'application/json',
        }
      });

      console.log("Shapes fetched successfully:", response.data);
      
      // Ensure we return an array even if the response structure is unexpected
      if (response.data && Array.isArray(response.data.elements)) {
        return response.data.elements as (Shape & { id: number })[];
      } else if (Array.isArray(response.data)) {
        return response.data as (Shape & { id: number })[];
      } else {
        console.warn("Unexpected response structure:", response.data);
        return [];
      }
    }, 2, 1000);
    
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Axios error fetching shapes:", {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
        method: error.config?.method,
        message: error.message
      });
      
      // Handle specific error cases
      if (error.response?.status === 404) {
        console.log("Document not found, returning empty shapes array");
        return [];
      }
      
      if (error.response?.status === 401) {
        console.error("Authentication failed - check cookies/credentials");
        throw new Error("Authentication failed. Please refresh the page and try again.");
      }
      
      if (error.response?.status === 500) {
        console.error("Server error - check backend logs");
        const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Internal server error';
        throw new Error(`Server error: ${errorMessage}`);
      }
    } else {
      console.error("Non-axios error fetching shapes:", error);
    }
    
    // For development: return empty array instead of throwing
    // For production: you might want to throw the error
    console.warn("Returning empty shapes array due to error");
    return [];
  }
}

export async function deleteShapesByIds(ids: number[]): Promise<void> {
  console.log("Attempting to delete shapes with IDs:", ids);
  
  try {
    if (!Array.isArray(ids) || ids.length === 0) {
      console.warn("Invalid IDs provided for deletion:", ids);
      return;
    }

    // Validate all IDs are numbers
    const validIds = ids.filter(id => typeof id === 'number' && id > 0);
    if (validIds.length !== ids.length) {
      console.warn("Some invalid IDs filtered out:", ids, "->", validIds);
    }

    if (validIds.length === 0) {
      console.warn("No valid IDs to delete");
      return;
    }

    await retryRequest(async () => {
      const response = await axios.delete(`${HTTP_BACKEND}/element`, {
        withCredentials: true,
        timeout: 10000,
        data: { ids: validIds },
        headers: {
          'Content-Type': 'application/json',
        }
      });
      return response;
    }, 2, 1000);

    console.log(`Elements with IDs ${validIds.join(", ")} deleted successfully.`);
    
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Axios error deleting elements:", {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
        message: error.message
      });
      
      if (error.response?.status === 401) {
        throw new Error("Authentication failed during deletion. Please refresh the page.");
      }
      
      if (error.response?.status === 500) {
        const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Internal server error';
        throw new Error(`Server error during deletion: ${errorMessage}`);
      }
    } else {
      console.error("Non-axios error deleting elements:", error);
    }
    
    // Re-throw the error so calling code can handle it appropriately
    throw error;
  }
}