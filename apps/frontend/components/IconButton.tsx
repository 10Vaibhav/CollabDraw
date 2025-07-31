import { ReactNode } from "react"

export function IconButton({icon,onClick,activated}:{
    icon: ReactNode,
    onClick : ()=> void,
    activated?: boolean
}) {
  return (
    <div className={`cursor-pointer rounded-md border-2 p-2 transition-colors ${activated ? `bg-[#3090A1] text-white border-[#3090A1]` : `text-[#3090A1] border-transparent hover:bg-[#7BCECC]/20 hover:border-[#7BCECC]/50` } `} onClick={onClick}> 
      {icon}
    </div>
  )
}
