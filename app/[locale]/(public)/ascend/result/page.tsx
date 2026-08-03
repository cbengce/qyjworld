import type { Metadata } from "next";
import { Suspense } from "react";
import { AscendResult } from "@/components/ascend/ascend-result";
import type { Locale } from "@/lib/constants";

export const metadata: Metadata = { title: "Your Ascend Tea Profile", description: "Your QING YUN JIAN Ascend Tea Profile result.", robots: { index: false, follow: false } };

export default function AscendResultPage({ params }: { params: { locale: Locale } }) {
  return <Suspense fallback={<main className="grid min-h-[70svh] place-items-center bg-paper text-forest">Preparing your profile…</main>}><AscendResult locale={params.locale} /></Suspense>;
}
