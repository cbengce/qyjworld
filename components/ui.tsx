import Link from "next/link";
import { ComponentProps } from "react";

export function Section({
  children,
  className = ""
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <section className={`px-5 py-16 md:px-8 md:py-24 ${className}`}>{children}</section>;
}

export function ButtonLink({ className = "", ...props }: ComponentProps<typeof Link>) {
  return (
    <Link
      className={`focus-ring inline-flex min-h-12 items-center justify-center px-5 text-sm font-bold transition duration-200 ${className}`}
      {...props}
    />
  );
}

export function SubmitButton({
  children,
  pending,
  pendingLabel = "Working...",
  className = ""
}: {
  children: React.ReactNode;
  pending: boolean;
  pendingLabel?: string;
  className?: string;
}) {
  return (
    <button
      aria-busy={pending}
      className={`focus-ring inline-flex min-h-12 items-center justify-center rounded-full bg-forest px-6 text-sm font-bold text-white shadow-[0_16px_42px_rgba(18,60,47,0.16)] transition duration-300 hover:-translate-y-0.5 hover:bg-ink disabled:pointer-events-none disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      disabled={pending}
      type="submit"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}

export function Field({
  label,
  name,
  type = "text",
  required = false
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-forest">
      {label}
      <input
        className="focus-ring min-h-12 rounded-sm border border-forest/15 bg-white px-4 text-base text-forest shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] transition duration-200 placeholder:text-forest/35 hover:border-forest/30"
        name={name}
        type={type}
        required={required}
      />
    </label>
  );
}
