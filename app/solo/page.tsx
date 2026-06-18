import Link from "next/link";
import SearchExperience from "@/components/search/SearchExperience";

export default function SoloPage() {
  return (
    <>
      <Link
        href="/solo/providers"
        className="fixed bottom-4 right-4 z-30 rounded-md border border-brand/50 bg-neutral-950/95 px-4 py-2 text-sm font-semibold text-brand-300 shadow-card transition-colors hover:bg-brand hover:text-white"
      >
        Provider lab
      </Link>
      <SearchExperience />
    </>
  );
}
