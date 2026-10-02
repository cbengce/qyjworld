"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { recoverOriginalMenu } from "@/app/[locale]/admin/menu/actions";

export function MenuCatalogueRecovery({ locale }: { locale: string }) {
  const router = useRouter();
  const started = useRef(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  async function recover() {
    setBusy(true); setError("");
    try {
      const result = await recoverOriginalMenu(locale);
      if (result.error) setError(result.error);
      else router.refresh();
    } catch { setError("Catalogue import could not finish. Please retry. Existing products have been preserved."); }
    finally { setBusy(false); }
  }
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void recover();
    // Run once when the authenticated empty menu is opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <section className="mt-6 rounded-2xl bg-white p-6 text-forest shadow-soft" aria-live="polite">
    <h2 className="text-xl font-bold">{busy ? "Preparing your original nine drinks…" : "Original catalogue setup"}</h2>
    <p className="mt-2">Original images and categories are being connected to the CMS. Prices remain blank for you to confirm in the outlet menu.</p>
    {error && <><p className="mt-3 text-red-700" role="alert">{error}</p><button className="mt-4 rounded-full bg-forest px-6 py-3 font-bold text-white" onClick={() => void recover()} disabled={busy}>Retry catalogue setup</button></>}
  </section>;
}
