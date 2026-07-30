"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";

export function QrCode({ value }: { value: string }) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    QRCode.toDataURL(value, { margin: 1, width: 180 }).then(setSrc).catch(() => setSrc(""));
  }, [value]);

  if (!src) return <div className="h-[180px] w-[180px] bg-mist" aria-label="QR code loading" />;
  return <img alt="Personal member QR code" className="h-[180px] w-[180px]" src={src} />;
}
