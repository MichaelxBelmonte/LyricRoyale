import Link from "next/link";

interface LogoProps {
  /** Height utility for the wordmark, e.g. "h-6" / "h-16 sm:h-24". */
  className?: string;
  /** Show the cassette logomark chip before the wordmark. */
  withMark?: boolean;
  /** Size of the mark chip when shown. */
  markClassName?: string;
  /** When set, the logo becomes a clickable link (usually "/" to go home). */
  href?: string;
}

/**
 * The Soundclash logo, built from the real brand assets in /public/brand:
 * the holographic "SOUNDCLASH" wordmark (background keyed out to transparent)
 * and the cassette logomark chip. Height-driven so it scales cleanly anywhere.
 * Pass `href` to make it a navigation control (e.g. the persistent "go home").
 */
export default function Logo({
  className = "h-6",
  withMark = false,
  markClassName = "h-8 w-8",
  href,
}: LogoProps) {
  const content = (
    <span className="inline-flex items-center gap-2.5">
      {withMark ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/brand/logomark.png"
          alt=""
          aria-hidden
          className={`shrink-0 rounded-lg border border-black/10 ${markClassName}`}
        />
      ) : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/wordmark.png" alt="Soundclash" className={`w-auto ${className}`} />
    </span>
  );

  if (href) {
    return (
      <Link
        href={href}
        aria-label="Soundclash — home"
        className="inline-flex shrink-0 rounded-md transition-opacity hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C2563B]"
      >
        {content}
      </Link>
    );
  }

  return content;
}
