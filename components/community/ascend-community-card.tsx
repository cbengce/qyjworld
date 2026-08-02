import Image from "next/image";
import { ASCEND_COMMUNITY, getAscendCommunityInviteUrl } from "@/lib/community";

export function AscendCommunityCard({ compact = false }: { compact?: boolean }) {
  const inviteUrl = getAscendCommunityInviteUrl();
  const lines = ASCEND_COMMUNITY.supportingLines;

  return (
    <section className={compact ? "bg-white px-5 py-16 md:px-8 md:py-20" : "bg-[#f8f5ed] px-5 py-20 md:px-8 md:py-28"}>
      <div
        className={
          compact
            ? "mx-auto grid min-w-0 max-w-5xl gap-8 overflow-hidden bg-[#f8f5ed] p-6 shadow-[0_22px_60px_rgba(10,24,20,0.07)] md:grid-cols-[minmax(0,1fr)_minmax(16rem,0.55fr)] md:items-center md:p-9"
            : "qyj-fade-up mx-auto grid min-w-0 max-w-7xl gap-10 overflow-hidden bg-white p-7 shadow-[0_28px_75px_rgba(10,24,20,0.08)] md:grid-cols-[minmax(0,1fr)_minmax(20rem,0.62fr)] md:items-center md:p-12"
        }
      >
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold">Community</p>
          <h2 className={`${compact ? "mt-4 text-4xl md:text-5xl" : "mt-5 text-5xl md:text-7xl"} break-words font-serif font-semibold leading-[0.98] text-forest`}>
            {compact ? ASCEND_COMMUNITY.compactHeading : ASCEND_COMMUNITY.heading}
          </h2>
          {compact ? (
            <p className="mt-5 max-w-2xl text-base leading-7 text-forest/65">{ASCEND_COMMUNITY.compactText}</p>
          ) : (
            <div className="mt-7 grid gap-3 text-lg font-semibold text-forest/70 sm:grid-cols-2">
              {lines.map((line) => (
                <p key={line} className="border-t border-forest/10 pt-3">
                  {line}
                </p>
              ))}
            </div>
          )}
          <p className="mt-7 text-sm font-semibold text-forest/55">{ASCEND_COMMUNITY.note}</p>
          {inviteUrl ? (
            <a
              className="focus-ring mt-7 inline-flex min-h-12 items-center justify-center rounded-full bg-forest px-7 text-sm font-bold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-ink"
              href={inviteUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              {ASCEND_COMMUNITY.buttonLabel}
            </a>
          ) : (
            <div className="mt-7 grid gap-2">
              <button
                className="inline-flex min-h-12 w-fit cursor-not-allowed items-center justify-center rounded-full bg-forest/35 px-7 text-sm font-bold text-white"
                disabled
                type="button"
              >
                {ASCEND_COMMUNITY.buttonLabel}
              </button>
              <p className="break-words text-xs font-semibold text-forest/50">Development note: configure NEXT_PUBLIC_WHATSAPP_COMMUNITY_URL to enable this button.</p>
            </div>
          )}
        </div>

        <div className="min-w-0 justify-self-center">
          <div className="bg-white p-4 shadow-[0_18px_55px_rgba(10,24,20,0.10)]">
            <Image
              alt={ASCEND_COMMUNITY.qrAlt}
              className="h-auto w-[min(78vw,20rem)] object-contain md:w-[min(32vw,26rem)]"
              height={526}
              sizes="(min-width: 768px) min(32vw, 416px), min(78vw, 320px)"
              src={ASCEND_COMMUNITY.qrImagePath}
              title="Scan to join the QING YUN JIAN Ascend Community on WhatsApp"
              unoptimized
              width={526}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
