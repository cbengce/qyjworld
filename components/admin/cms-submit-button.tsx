"use client";

import { useFormStatus } from "react-dom";

export function CmsSubmitButton({
  children,
  pendingLabel = "Saving...",
  className = ""
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      aria-busy={pending}
      className={`focus-ring min-h-12 rounded-full bg-forest px-6 text-sm font-bold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-ink disabled:pointer-events-none disabled:translate-y-0 disabled:opacity-60 ${className}`}
      disabled={pending}
      type="submit"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
