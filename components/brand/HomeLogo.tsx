import Logo from "@/components/brand/Logo";

/**
 * A small, fixed top-left Soundclash logo that links home. Dropped onto the
 * otherwise chrome-less sub-pages (create / join / provider lab) so there is
 * always a consistent way back to the landing.
 */
export default function HomeLogo() {
  return (
    <div className="fixed left-[max(0.75rem,env(safe-area-inset-left))] top-[max(0.75rem,env(safe-area-inset-top))] z-30 sm:left-[max(1.25rem,env(safe-area-inset-left))] sm:top-[max(1.25rem,env(safe-area-inset-top))]">
      <Logo href="/" className="h-5 sm:h-6" withMark markClassName="h-7 w-7" />
    </div>
  );
}
