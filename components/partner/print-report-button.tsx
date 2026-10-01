"use client";
export function PrintReportButton() {
  return <button className="focus-ring min-h-12 rounded-full bg-forest px-6 text-sm font-bold text-white" type="button" onClick={()=>window.print()}>Print / Save PDF</button>;
}
