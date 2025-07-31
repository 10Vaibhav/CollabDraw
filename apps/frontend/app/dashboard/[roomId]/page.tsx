import { getCookies } from "@/auth/auth";

import { RoomCanvas } from "@/components/RoomCanvas";

export default async function dashboard({
  params,
}: {
  params: {
    roomId: string;
  };
}) {
  const roomId = (await params).roomId;

  const token = await getCookies();

  if (token === undefined) {
    return <div>Token is undefined</div>;
  }

  return <RoomCanvas roomId={roomId} token={token} />;
}
