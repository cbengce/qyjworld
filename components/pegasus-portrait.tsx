/** Windows onto the approved eleven-character artwork; no new characters. */
const portraits: Record<string, string> = {
  lunatide: "390 305 445 510", nightnectar: "810 345 320 460",
  evenfall: "1135 340 255 320", clearsky: "445 30 350 250",
  monsoon: "815 25 290 240", glowstate: "1370 295 300 245",
  stillearth: "15 495 280 300", cloudlift: "175 265 310 230",
  drift: "1190 20 375 280", goldentide: "15 15 360 275",
  scarletsky: "1320 555 350 330"
};
export function PegasusPortrait({ name, className = "" }: { name: string; className?: string }) {
  const key = name.toLowerCase().replace(/[^a-z]/g, "").replace(/^qyj/, "");
  const viewBox = portraits[key];
  if (!viewBox) return null;
  return <div aria-hidden="true" className={`qyj-character ${className}`}><svg viewBox={viewBox} className="h-full w-full" focusable="false"><image href="/assets/hero-pegasus-family-eleven-v1.webp" width="1672" height="941" /></svg></div>;
}
