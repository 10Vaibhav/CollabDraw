import { useEffect, useState } from "react";
import { WS_URL } from "../app/config";

export function useSocket(){
    const [loading, setLoading] = useState(true);
    const [socket, setSocket] = useState<WebSocket>();

    useEffect(()=> {
        const ws = new WebSocket(`${WS_URL}?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NmUyMWI3ZS0xMWE3LTQxYTUtODVhMy04ZDc5NWM2MTkzN2EiLCJpYXQiOjE3NDkzOTI1NTV9.NsWHi29f0JiLaS_fclKP3hUo75tN1pc7Y2g9c4XaeCk`);
        ws.onopen = ()=> {
            setLoading(false);
            setSocket(ws);
        }
    },[]);

    return {
        socket,
        loading
    };
}
