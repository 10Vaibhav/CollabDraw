import { RoomCanvas } from "@/components/RoomCanvas";
import { cookies } from "next/headers";

interface PageProps {
  params: Promise<{ roomId: string }>;
}

export default async function Page({ params }: PageProps) {
  const { roomId } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  return <RoomCanvas roomId={roomId} token={token} />;
}
