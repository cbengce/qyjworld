import Image from "next/image";

/** Independent renders of the owner's approved eleven-character family. */
const portraits: Record<string, string> = {
  lunatide: "luna-tide", nightnectar: "night-nectar",
  evenfall: "evenfall", clearsky: "clearsky",
  monsoon: "monsoon", glowstate: "glowstate",
  stillearth: "stillearth", cloudlift: "cloudlift",
  drift: "drift", goldentide: "golden-tide",
  scarletsky: "scarlet-sky"
};
export function PegasusPortrait({ name, className = "" }: { name: string; className?: string }) {
  const key = name.toLowerCase().replace(/[^a-z]/g, "").replace(/^qyj/, "");
  const portrait = portraits[key];
  if (!portrait) return null;
  return <div aria-hidden="true" className={`shrink-0 ${className}`}><Image src={`/assets/pegasus/individual-v1/${portrait}.webp`} alt="" width={640} height={640} className="h-full w-full object-contain" /></div>;
}
