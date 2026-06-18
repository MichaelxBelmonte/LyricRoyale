"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

interface JoinQrProps {
  /** The full join URL encoded into the QR. */
  url: string;
  /** Rendered pixel size of the square. */
  size?: number;
  className?: string;
}

/**
 * A scannable join QR. Rendered ink-on-white (maximum contrast so it reads from a
 * phone across a room / off a projector) and generated client-side from the qrcode
 * lib — no network round-trip, so the room URL never leaves the device.
 */
export default function JoinQr({ url, size = 160, className = "" }: JoinQrProps) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void QRCode.toDataURL(url, {
      width: size * 3, // oversample for crisp scaling on hi-dpi / big screens
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#0b0b0b", light: "#ffffff" },
    })
      .then((dataUrl) => {
        if (active) setSrc(dataUrl);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [url, size]);

  return (
    <span
      className={`inline-flex items-center justify-center rounded-xl bg-white p-2 ${className}`}
      style={{ width: size, height: size }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="Scan to join the room" width={size - 16} height={size - 16} className="h-full w-full" />
      ) : (
        <span className="block h-full w-full animate-pulse rounded-md bg-black/5" aria-hidden />
      )}
    </span>
  );
}
