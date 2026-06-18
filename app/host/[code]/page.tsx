import HostRoom from "@/components/session/HostRoom";

interface HostRoomPageProps {
  params: Promise<{ code: string }>;
}

export default async function HostRoomPage({ params }: HostRoomPageProps) {
  const { code } = await params;
  return <HostRoom code={code.toUpperCase()} />;
}
