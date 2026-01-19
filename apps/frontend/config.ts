
// Use environment variables for production URLs
export const HTTP_BACKEND = process.env.NEXT_PUBLIC_HTTP_BACKEND || 
  (process.env.NODE_ENV === 'production' 
    ? "https://collabdraw-http.vaibhavm.tech/api"
    : "http://localhost:3001")

export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 
  (process.env.NODE_ENV === 'production'
    ? "wss://collabdraw-ws.vaibhavm.tech"
    : "ws://localhost:3002") 