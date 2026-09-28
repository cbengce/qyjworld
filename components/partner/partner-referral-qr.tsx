"use client";

import Image from "next/image";
import QRCode from "qrcode";
import { useEffect, useState } from "react";

export function PartnerReferralQr({ partnerCode, url }: { partnerCode: string; url: string }) {
  const [imageUrl, setImageUrl] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    QRCode.toDataURL(url, {
      width: 1000,
      margin: 4,
      errorCorrectionLevel: "M",
      color: {
        dark: "#123C2FFF",
        light: "#FFFFFFFF"
      }
    })
      .then((value) => {
        if (active) setImageUrl(value);
      })
      .catch(() => {
        if (active) setMessage("Unable to generate the QR code.");
      });

    return () => {
      active = false;
    };
  }, [url]);

  function download() {
    if (!imageUrl) return;
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = `QYJ-${partnerCode}-Partner-QR.png`;
    link.click();
    setMessage("QR code downloaded.");
  }

  return (
    <div className="mt-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
      <div className="bg-white p-3 shadow-sm">
        {imageUrl ? (
          <Image
            alt={`Partner referral QR code for ${partnerCode}`}
            className="h-[220px] w-[220px]"
            height={1000}
            src={imageUrl}
            unoptimized
            width={1000}
          />
        ) : (
          <div aria-label="Generating partner referral QR code" className="h-[220px] w-[220px] animate-pulse bg-paper" />
        )}
      </div>
      <div>
        <p className="max-w-sm text-sm leading-6 text-ink/60">Customers can scan this code to continue through your QING YUN JIAN referral link.</p>
        <button
          className="focus-ring mt-4 min-h-12 rounded-full border border-forest/25 px-6 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!imageUrl}
          onClick={download}
          type="button"
        >
          Download QR
        </button>
        <p aria-live="polite" className="mt-2 min-h-5 text-sm text-ink/60">{message}</p>
      </div>
    </div>
  );
}

