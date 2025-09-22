import { RoomCanvas } from "@/components/RoomCanvas";
import { cookies } from "next/headers";

export default async function Page({ params }: { params: { roomId: string } }) {
  const { roomId } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  return <RoomCanvas roomId={roomId} token={token} />;
}
