"use client";

import { useState } from "react";

export function CopyPartnerLink({ url }: { url: string }) {
  const [message, setMessage] = useState("");

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setMessage("Link copied.");
    } catch {
      setMessage("Unable to copy. Select the link and copy it manually.");
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <code className="min-w-0 flex-1 break-all bg-paper px-4 py-3 text-sm text-ink">{url}</code>
        <button className="focus-ring min-h-12 shrink-0 rounded-full bg-forest px-6 text-sm font-bold text-white" onClick={() => void copy()} type="button">
          Copy Link
        </button>
      </div>
      <p aria-live="polite" className="mt-2 min-h-5 text-sm text-ink/60">{message}</p>
    </div>
  );
}
