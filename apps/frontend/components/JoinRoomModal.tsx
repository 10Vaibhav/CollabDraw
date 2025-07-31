"use client";
import { useState } from "react";
import { X } from "lucide-react";
import axios from "axios";
import { HTTP_BACKEND } from "@/config";
import { useRouter } from "next/navigation";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export default function JoinRoomModal({ isOpen, onClose }: Props) {
  const [roomId, setRoomId] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  if (!isOpen) return null;

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const res = await axios.get(`${HTTP_BACKEND}/document/${roomId}`, {
        withCredentials: true,
      });
      const foundId = res.data.document.id;
      router.push(`/dashboard/${foundId}`);
    } catch (err) {
      console.error("Join room error:", err);
      setError("Failed to join room. Please ensure the name is correct.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full shadow-xl">
        <div className="flex justify-between items-center p-6 border-b border-[#7BCECC]/30">
          <h2 className="text-xl font-medium text-[#3090A1]">Join Canvas Room</h2>
          <button onClick={onClose} className="text-[#7BCECC] hover:text-[#3090A1]">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleJoinRoom} className="p-6 space-y-4">
          {error && <p className="text-[#BC5148] text-sm">{error}</p>}
          <div>
            <label htmlFor="room-id" className="block text-sm font-medium text-[#3090A1] mb-1">
              Room ID
            </label>
            <input
              id="room-id"
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="w-full px-3 py-2 border rounded-md border-[#7BCECC]/50 focus:outline-none focus:ring-2 focus:ring-[#3090A1]"
              placeholder="Enter room ID"
            />
          </div>
          <div className="flex justify-end">
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-[#3090A1] rounded-md hover:bg-[#7BCECC]">
              Join Room
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
