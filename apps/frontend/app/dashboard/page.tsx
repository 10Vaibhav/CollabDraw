'use client';

import { useCallback, useEffect, useState } from "react";
import { PlusCircle, Grid, LogOut } from 'lucide-react';
import axios from 'axios';
import { useRouter } from 'next/navigation';

import RoomCard from '@/components/RoomCard';
import CreateRoomModal from '@/components/CreateRoomModal';
import JoinRoomModal from '@/components/JoinRoomModal';
import { HTTP_BACKEND } from '@/config';

interface Room {
  id: number;
  slug: string;
}

export default function Dashboard() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
    const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${HTTP_BACKEND}/documents`, { withCredentials: true });
        setRooms(res.data.documents);
      } catch (err) {
        console.error('Error fetching rooms:', err);
        setError('Failed to load rooms. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchRooms();
  }, []);

  const handleLogout = async () => {
    try {
      await axios.post(`${HTTP_BACKEND}/logout`, {}, { withCredentials: true });
      router.replace('/login');
    } catch (err) {
      console.error('Logout failed:', err);
      alert('Logout failed. Please try again.');
    }
  };

  const handleDeleteRoom = async (roomId: number) => {
    // Optional: Add a confirmation dialog before deleting
    if (window.confirm('Are you sure you want to delete this room?')) {
      try {
        await axios.delete(`${HTTP_BACKEND}/documents/${roomId}`, {
          withCredentials: true,
        });
        setRooms((prevRooms) => prevRooms.filter((room) => room.id !== roomId));
      } catch (err) {
        console.error('Error deleting room:', err);
        setError('Failed to delete room. Please try again later.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#FEF8E6]">
      <main className="container mx-auto px-4 pt-24 pb-12">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-serif font-bold text-[#3090A1]">Your Canvas Rooms</h1>
            <p className="text-[#7BCECC] mt-1">
              Create and manage collaborative drawing spaces
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-[#3090A1] text-white px-4 py-2 rounded-full flex items-center gap-2 hover:bg-[#7BCECC] transition-all"
              aria-label="Create new room"
            >
              <PlusCircle size={20} />
              <span>New Room</span>
            </button>

            <button
              onClick={() => setIsJoinModalOpen(true)}
              className="bg-[#7BCECC] text-white px-4 py-2 rounded-full flex items-center gap-2 hover:bg-[#3090A1] transition-all"
              aria-label="Join existing room"
            >
              <Grid size={20} />
              <span>Join Room</span>
            </button>

            <button
              onClick={handleLogout}
              className="bg-[#BC5148] text-white px-4 py-2 rounded-full flex items-center gap-2 hover:bg-opacity-90 transition-all"
              aria-label="Logout"
            >
              <LogOut size={20} />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="text-[#BC5148] mb-4 text-center font-medium">{error}</div>
        )}

        {loading ? (
          <div className="text-center text-[#7BCECC] mt-10">Loading rooms...</div>
        ) : rooms.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map((x) => (
              <RoomCard
                key={x.id}
                room={x}
                onClick={() => router.replace(`/dashboard/${x.id}`)}
                onDelete={handleDeleteRoom}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 bg-[#7BCECC]/10 rounded-lg border border-dashed border-[#7BCECC]/50">
            <div className="flex flex-col items-center text-center max-w-md">
              <Grid size={48} className="text-[#7BCECC] mb-4" />
              <h3 className="text-xl font-medium mb-2 text-[#3090A1]">No Canvas Rooms Yet</h3>
              <p className="text-[#7BCECC] mb-4">
                Create your first canvas room to start collaborating with your team.
              </p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-[#3090A1] text-white px-4 py-2 rounded-full flex items-center gap-2 hover:bg-[#7BCECC] transition-all"
                aria-label="Create your first room"
              >
                <PlusCircle size={20} />
                <span>Create Room</span>
              </button>
            </div>
          </div>
        )}

        {isCreateModalOpen && (
          <CreateRoomModal
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
          />
        )}

        {isJoinModalOpen && (
          <JoinRoomModal
            isOpen={isJoinModalOpen}
            onClose={() => setIsJoinModalOpen(false)}
          />
        )}
      </main>
    </div>
  );
}
