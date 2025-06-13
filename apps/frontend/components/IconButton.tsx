import { ReactNode } from "react";

export function IconButton({icon, onClick, activated}: {icon: ReactNode, onClick: ()=> void, activated: boolean}){

    return <div className={`m-2 pointer rounded-full border-2 border-white p-2 bg-black hover:bg-gray ${activated? "text-red-700": "text-white"}`} onClick={onClick}>
        {icon}
    </div>
}
