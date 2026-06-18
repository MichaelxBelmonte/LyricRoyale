import PlayerRoom from "@/components/session/PlayerRoom";

interface PlayerRoomPageProps {
  params: Promise<{ code: string }>;
}

export default async function PlayerRoomPage({ params }: PlayerRoomPageProps) {
  const { code } = await params;
  return <PlayerRoom code={code.toUpperCase()} />;
}
