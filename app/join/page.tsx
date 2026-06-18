import { Suspense } from "react";
import JoinSession from "@/components/session/JoinSession";

export default function JoinPage() {
  return (
    <Suspense fallback={null}>
      <JoinSession />
    </Suspense>
  );
}
