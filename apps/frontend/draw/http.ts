import axios from "axios"
import { HTTP_BACKEND } from "../config";
import { Shape } from "./types";

// Helper function to convert database element to frontend shape
function convertElementToShape(element: any): Shape & { id: number } {
  console.log("Converting element from DB:", element);
  
  const baseShape = {
    id: element.id,
    type: element.type,
  };

  switch (element.type) {
    case "rect":
      return {
        ...baseShape,
        type: "rect" as const,
        x: element.x || 0,
        y: element.y || 0,
        width: element.width || 0,
        height: element.height || 0,
      };
    
    case "circle":
      return {
        ...baseShape,
        type: "circle" as const,
        centerX: element.centerX || 0,
        centerY: element.centerY || 0,
        radius: element.radius || 0,
      };
    
    case "line":
      return {
        ...baseShape,
        type: "line" as const,
        startX: element.startX || 0,
        startY: element.startY || 0,
        endX: element.endX || 0,
        endY: element.endY || 0,
      };
      
    case "arrow":
      return {
        ...baseShape,
        type: "arrow" as const,
        startX: element.startX || 0,
        startY: element.startY || 0,
        endX: element.endX || 0,
        endY: element.endY || 0,
      };
      
    case "diamond":
      return {
        ...baseShape,
        type: "diamond" as const,
        centerX: element.centerX || 0,
        centerY: element.centerY || 0,
        width: element.width || 0,
        height: element.height || 0,
      };
      
    case "ellipse":
      return {
        ...baseShape,
        type: "ellipse" as const,
        centerX: element.centerX || 0,
        centerY: element.centerY || 0,
        radiusX: element.radiusX || 0,
        radiusY: element.radiusY || 0,
      };
    
    case "parallelogram":
      const skew = Math.max(0, Math.min(89, element.skew || 0));
      return {
        ...baseShape,
        type: "parallelogram" as const,
        x: element.x || 0,
        y: element.y || 0,
        width: element.width || 0,
        height: element.height || 0,
        skew: skew,
      };
    
    default:
      console.warn("Unknown shape type:", element.type);
      // Return a fallback rectangle shape
      return {
        ...baseShape,
        type: "rect" as const,
        x: element.x || 0,
        y: element.y || 0,
        width: element.width || 10,
        height: element.height || 10,
      };
  }
}

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
  
  // Validate documentId
  if (!documentId || documentId <= 0 || isNaN(documentId)) {
    console.warn("Invalid document ID provided:", documentId);
    return [];
  }

  try {
    // Use a mock response if the backend is not available
    // This ensures shapes are still available after refresh even if backend is down
    const localShapesKey = `excalidraw_shapes_${documentId}`;
    
    return await retryRequest(async () => {
      try {
        const response = await axios.get(`${HTTP_BACKEND}/elements/${documentId}`, {
          withCredentials: true,
          timeout: 5000, // Reduced timeout for faster fallback
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        console.log("Shapes fetched successfully from server:", response.data);
        
        // Process the response data and convert DB format to frontend format
        let elements: any[] = [];
        if (response.data && Array.isArray(response.data.elements)) {
          elements = response.data.elements;
        } else if (Array.isArray(response.data)) {
          elements = response.data;
        } else {
          console.warn("Unexpected response structure:", response.data);
          return [];
        }
        
        // Save shapes to local storage as backup
        if (elements.length > 0) {
          try {
            localStorage.setItem(localShapesKey, JSON.stringify(elements));
          } catch (e) {
            console.warn("Failed to save shapes to local storage:", e);
          }
        }
        
        // Convert database format to frontend Shape format
        const shapes: (Shape & { id: number })[] = elements.map((element: any) => convertElementToShape(element));

        console.log("Converted shapes:", shapes);
        return shapes;
        
      } catch (error) {
        if (axios.isAxiosError(error)) {
          // Check if this is the specific Prisma error about Element.bold column
          const errorData = error.response?.data as string;
          if (errorData && errorData.includes("The column `Element.bold` does not exist")) {
            console.warn("Database schema mismatch detected. Using local storage fallback.");
          } else {
            // For other errors, log details but with reduced verbosity
            console.warn(`Backend error (${error.response?.status}): ${error.message}`);
            // Log full details at debug level
            if (process.env.NODE_ENV === 'development') {
              console.debug('Full error details:', {
                status: error.response?.status,
                statusText: error.response?.statusText,
                url: error.config?.url,
                method: error.config?.method
              });
            }
          }
        } else {
          console.warn("Error fetching shapes:", error instanceof Error ? error.message : String(error));
        }
        
        // Try to load shapes from local storage as fallback
        try {
          const localShapes = localStorage.getItem(localShapesKey);
          if (localShapes) {
            console.log("Loading shapes from local storage fallback");
            const elements = JSON.parse(localShapes);
            if (Array.isArray(elements) && elements.length > 0) {
              return elements.map((element: any) => convertElementToShape(element));
            }
          }
        } catch (e) {
          console.error("Error loading shapes from local storage:", e);
        }
        
        return [];
      }

      // Convert database format to frontend Shape format
      const shapes: (Shape & { id: number })[] = elements.map((element: any) => {
        console.log("Converting element from DB:", element);
        
        const baseShape = {
          id: element.id,
          type: element.type,
        };

        switch (element.type) {
          case "rect":
            return {
              ...baseShape,
              type: "rect" as const,
              x: element.x || 0,
              y: element.y || 0,
              width: element.width || 0,
              height: element.height || 0,
            };
          
          case "circle":
            return {
              ...baseShape,
              type: "circle" as const,
              centerX: element.centerX || 0,
              centerY: element.centerY || 0,
              radius: element.radius || 0,
            };
          
          case "line":
            return {
              ...baseShape,
              type: "line" as const,
              startX: element.startX || 0,
              startY: element.startY || 0,
              endX: element.endX || 0,
              endY: element.endY || 0,
            };
          
          case "arrow":
            return {
              ...baseShape,
              type: "arrow" as const,
              startX: element.startX || 0,
              startY: element.startY || 0,
              endX: element.endX || 0,
              endY: element.endY || 0,
            };
          
          case "diamond":
            return {
              ...baseShape,
              type: "diamond" as const,
              centerX: element.centerX || 0,
              centerY: element.centerY || 0,
              width: element.width || 0,
              height: element.height || 0,
            };
          
          case "ellipse":
            // Handle ellipse: use radiusX/radiusY if available, otherwise fallback to width/height
            const radiusX = element.radiusX || (element.width ? element.width / 2 : 0);
            const radiusY = element.radiusY || (element.height ? element.height / 2 : 0);
            
            console.log("Ellipse conversion - radiusX:", radiusX, "radiusY:", radiusY, "from element:", {
              radiusX: element.radiusX,
              radiusY: element.radiusY,
              width: element.width,
              height: element.height
            });
            
            return {
              ...baseShape,
              type: "ellipse" as const,
              centerX: element.centerX || 0,
              centerY: element.centerY || 0,
              radiusX: radiusX,
              radiusY: radiusY,
            };
          
          case "parallelogram":
            // Handle parallelogram: use skew field if available, otherwise default to 0
            const skew = element.skew !== null ? element.skew : 0;
            
            console.log("Parallelogram conversion - skew:", skew, "from element:", {
              skew: element.skew,
              x: element.x,
              y: element.y,
              width: element.width,
              height: element.height
            });
            
            return {
              ...baseShape,
              type: "parallelogram" as const,
              x: element.x || 0,
              y: element.y || 0,
              width: element.width || 0,
              height: element.height || 0,
              skew: skew,
            };
          
          default:
            console.warn("Unknown shape type:", element.type);
            // Return a fallback rectangle shape
            return {
              ...baseShape,
              type: "rect" as const,
              x: element.x || 0,
              y: element.y || 0,
              width: element.width || 10,
              height: element.height || 10,
            };
        }
      });

      console.log("Converted shapes:", shapes);
      return shapes;
      
    }, 3, 2000); // Increased retries and delay
    
  } catch (error) {
    console.error("Error in getExistingShapes:", error);
    // Always return empty array instead of throwing errors
    return [];
  }
}

export async function saveShape(shape: Shape, documentId: number): Promise<number> {
  console.log("Saving shape to database:", shape, "for document:", documentId);
  
  try {
    if (!documentId || documentId <= 0) {
      console.warn("Invalid document ID for saving shape:", documentId);
      throw new Error("Invalid document ID");
    }

    // Prepare the shape data based on its type
    const shapeData: any = {
      type: shape.type,
      documentId: documentId
    };

    // Add specific properties based on shape type
    switch (shape.type) {
      case "rect":
        shapeData.x = shape.x;
        shapeData.y = shape.y;
        shapeData.width = shape.width;
        shapeData.height = shape.height;
        break;
      case "circle":
        shapeData.centerX = shape.centerX;
        shapeData.centerY = shape.centerY;
        shapeData.radius = shape.radius;
        break;
      case "line":
      case "arrow":
        shapeData.startX = shape.startX;
        shapeData.startY = shape.startY;
        shapeData.endX = shape.endX;
        shapeData.endY = shape.endY;
        break;
      case "diamond":
        shapeData.centerX = shape.centerX;
        shapeData.centerY = shape.centerY;
        shapeData.width = shape.width;
        shapeData.height = shape.height;
        break;
      case "ellipse":
        shapeData.centerX = shape.centerX;
        shapeData.centerY = shape.centerY;
        shapeData.radiusX = shape.radiusX;
        shapeData.radiusY = shape.radiusY;
        break;
      case "parallelogram":
        shapeData.x = shape.x;
        shapeData.y = shape.y;
        shapeData.width = shape.width;
        shapeData.height = shape.height;
        shapeData.skew = shape.skew;
        break;
      case "eraser":
        // Skip saving eraser actions to the database
        console.log("Skipping save of eraser action");
        return { id: -1 }; // Return dummy ID for eraser actions
      default:
        console.warn("Unknown shape type for saving:", shape.type);
        throw new Error(`Unsupported shape type: ${shape.type}`);
    }

    // Save to local storage as backup
    try {
      const localShapesKey = `excalidraw_shapes_${documentId}`;
      const existingShapesStr = localStorage.getItem(localShapesKey);
      const existingShapes = existingShapesStr ? JSON.parse(existingShapesStr) : [];
      
      // Generate a temporary local ID if needed
      const tempId = Date.now() + Math.floor(Math.random() * 1000);
      const shapeWithId = { ...shapeData, id: tempId };
      
      existingShapes.push(shapeWithId);
      localStorage.setItem(localShapesKey, JSON.stringify(existingShapes));
    } catch (e) {
      console.warn("Failed to save shape to local storage:", e);
    }

    // Send to HTTP backend
    const response = await retryRequest(async () => {
      return await axios.post(`${HTTP_BACKEND}/element`, shapeData, {
        withCredentials: true,
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
        }
      });
    }, 2, 1000);

    if (response.data && response.data.id) {
      console.log("Shape saved successfully with ID:", response.data.id);
      
      // Update local storage with the real ID
      try {
        const localShapesKey = `excalidraw_shapes_${documentId}`;
        const existingShapesStr = localStorage.getItem(localShapesKey);
        if (existingShapesStr) {
          const existingShapes = JSON.parse(existingShapesStr);
          // Replace the temporary ID with the real one
          const updatedShapes = existingShapes.map((s: any) => {
            if (s.id === tempId) {
              return { ...s, id: response.data.id };
            }
            return s;
          });
          localStorage.setItem(localShapesKey, JSON.stringify(updatedShapes));
        }
      } catch (e) {
        console.warn("Failed to update shape ID in local storage:", e);
      }
      
      return response.data.id;
    } else {
      console.warn("Shape saved but no ID returned:", response.data);
      return -1;
    }
  } catch (error) {
    console.error("Error saving shape:", error);
    throw error;
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

    // Also remove from local storage to ensure persistence
    try {
      // Get document ID from URL or other source
      const urlParams = new URLSearchParams(window.location.search);
      const documentId = urlParams.get('id') || '1'; // Default to '1' if not found
      const localShapesKey = `excalidraw_shapes_${documentId}`;
      
      const existingShapesStr = localStorage.getItem(localShapesKey);
      if (existingShapesStr) {
        const existingShapes = JSON.parse(existingShapesStr);
        // Filter out the shapes with IDs that should be deleted
        const updatedShapes = existingShapes.filter((shape: any) => 
          !validIds.includes(shape.id)
        );
        localStorage.setItem(localShapesKey, JSON.stringify(updatedShapes));
        console.log(`Removed ${existingShapes.length - updatedShapes.length} shapes from local storage`);
      }
    } catch (e) {
      console.warn("Failed to update local storage during deletion:", e);
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
      const errorDetails = {
        status: error.response?.status || 'No status',
        statusText: error.response?.statusText || 'No status text',
        data: error.response?.data || 'No data',
        url: error.config?.url || 'No URL',
        message: error.message || 'No message'
      };
      console.warn(`Backend error during deletion (${errorDetails.status}): ${errorDetails.message}`);
      
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
