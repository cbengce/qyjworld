"use client";

import { FormEvent, useState } from "react";

export type SchoolAdminRow = {
  id: string;
  schoolName: string;
};

export function AscendSchoolCupAdmin({ schools }: { schools: SchoolAdminRow[] }) {
  const [schoolId, setSchoolId] = useState("");
  const [cups, setCups] = useState(1);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/ascend/school-cups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolId, cups })
      });
      const payload = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Purchase could not be recorded.");
      setCups(1);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Purchase could not be recorded.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="w-full max-w-xl border border-forest/10 bg-white p-6 shadow-soft md:p-8">
      <form className="grid gap-6" onSubmit={save}>
        <label className="grid gap-2 text-sm font-bold">Select School
          <select className="focus-ring min-h-14 border border-forest/20 bg-white px-4 text-base font-normal" onChange={(event) => setSchoolId(event.target.value)} required value={schoolId}>
            <option value="">Choose a school</option>
            {schools.map((school) => <option key={school.id} value={school.id}>{school.schoolName}</option>)}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-bold">Cup Quantity
          <input className="focus-ring min-h-14 max-w-xs border border-forest/20 px-4 text-lg font-bold" max={10000} min={1} onChange={(event) => setCups(Number(event.target.value))} required type="number" value={cups} />
        </label>
        <button className="focus-ring min-h-14 w-fit rounded-full bg-forest px-9 font-bold text-white disabled:opacity-50" disabled={busy || !schoolId} type="submit">{busy ? "Saving..." : "Save"}</button>
      </form>
      {message ? <p aria-live="assertive" className="text-sm font-semibold text-red-700">{message}</p> : null}
    </section>
  );
}
