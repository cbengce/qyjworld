"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createAscendCard } from "@/lib/ascend/card";
import { ascendProfiles, isAscendProfileSlug } from "@/lib/ascend/profiles";
import { trackAscendEvent } from "@/lib/ascend/analytics";
import { createAscendReferral, recordAscendReferral, REFERRAL_CODE_PATTERN } from "@/lib/ascend/referrals";

function captionFor(name: string, title: string, quote: string, referralCode: string | null) {
  const discoveryUrl = referralCode ? `https://qyjworld.com/en/ascend?ref=${referralCode}` : "https://qyjworld.com/en/ascend";
  return `Today, my Ascend Profile is ${name} — ${title.replaceAll(" ", " ").replace(/\b\w/g, (letter) => letter.toUpperCase())}.\n\n${quote}\n\nDiscover yours:\n${discoveryUrl}\n\n#QingYunJian\n#BornToAscend\n#AscendTeaProfile\n#SparklingTeaReimagined`;
}

export function AscendResult({ locale }: { locale: string }) {
  const searchParams = useSearchParams();
  const queryProfile = searchParams.get("profile");
  const slug = isAscendProfileSlug(queryProfile) ? queryProfile : null;
  const profile = slug ? ascendProfiles[slug] : null;
  const [cardBlob, setCardBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const queryReferral = searchParams.get("rid");
  const [referralCode, setReferralCode] = useState<string | null>(REFERRAL_CODE_PATTERN.test(queryReferral ?? "") ? queryReferral : null);

  useEffect(() => { if (profile) trackAscendEvent("ascend_result_viewed", { locale, profile: profile.slug }); }, [locale, profile]);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);
  useEffect(() => {
    if (!profile || referralCode) return;
    void createAscendReferral(profile.slug)
      .then((created) => { if (created.referralCode) setReferralCode(created.referralCode); })
      .catch(() => setStatus("Referral services are temporarily unavailable. Please retry before creating your card."));
  }, [profile, referralCode]);
  const caption = useMemo(() => profile ? captionFor(profile.nameEn, profile.title, profile.quote, referralCode) : "", [profile, referralCode]);

  if (!profile) return <main className="grid min-h-[70svh] place-items-center bg-paper px-5 text-center"><div><h1 className="font-serif text-5xl font-semibold text-forest">Your profile is waiting.</h1><p className="mt-5 text-forest/60">Complete the five questions to discover today&apos;s tea.</p><Link className="focus-ring mt-8 inline-flex min-h-12 items-center rounded-full bg-forest px-7 font-bold text-white" href={`/${locale}/ascend`}>Begin the profile</Link></div></main>;
  const activeProfile = profile;

  async function generate() {
    if (!referralCode) { setStatus("Your referral QR is still being prepared. Please try again."); return; }
    setGenerating(true); setStatus("");
    try {
      const blob = await createAscendCard(activeProfile, referralCode);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setCardBlob(blob); setPreviewUrl(URL.createObjectURL(blob)); setStatus("Your Ascend Card is ready.");
      trackAscendEvent("ascend_card_generated", { locale, profile: activeProfile.slug, referral_code: referralCode });
    } catch (error) { setStatus(error instanceof Error ? error.message : "The card could not be created. Please try again."); }
    finally { setGenerating(false); }
  }

  function download() {
    if (!cardBlob) return;
    const url = URL.createObjectURL(cardBlob); const link = document.createElement("a");
    link.href = url; link.download = `qing-yun-jian-ascend-profile-${activeProfile.slug}.png`;
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000); setStatus("Your Ascend Card is ready.");
    trackAscendEvent("ascend_download_card", { locale, profile: activeProfile.slug, referral_code: referralCode ?? undefined });
  }

  async function share() {
    if (!cardBlob) return;
    const file = new File([cardBlob], `qing-yun-jian-ascend-profile-${activeProfile.slug}.png`, { type: "image/png" });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], text: `Today, my Ascend Profile is ${activeProfile.nameEn} — ${activeProfile.title}.\n\nDiscover yours at QING YUN JIAN.`, url: referralCode ? `https://qyjworld.com/en/ascend?ref=${referralCode}` : "https://qyjworld.com/en/ascend" }); if (referralCode) void recordAscendReferral("share", referralCode); trackAscendEvent("ascend_share_card", { locale, profile: activeProfile.slug, referral_code: referralCode ?? undefined }); return; } catch (error) { if (error instanceof DOMException && error.name === "AbortError") return; }
    }
    download(); await navigator.clipboard?.writeText(caption); if (referralCode) void recordAscendReferral("share", referralCode); trackAscendEvent("ascend_share_card", { locale, profile: activeProfile.slug, referral_code: referralCode ?? undefined }); setStatus("Card downloaded and caption copied. Add them to your preferred social app.");
  }

  async function copyCaption() { await navigator.clipboard.writeText(caption); setStatus("Caption copied."); trackAscendEvent("ascend_caption_copied", { locale, profile: activeProfile.slug, referral_code: referralCode ?? undefined }); }

  return <main className="overflow-hidden bg-paper text-forest">
    <section className="px-5 py-14 md:px-8 md:py-20"><div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="relative aspect-[3/2] overflow-hidden bg-white shadow-soft"><Image alt={`${profile.nameEn} tea recommendation artwork`} className="object-contain" fill priority sizes="(min-width: 1024px) 45vw, 100vw" src={profile.image} title={`${profile.nameEn} by QING YUN JIAN`} /></div>
      <div><p className="text-xs font-bold uppercase tracking-[0.22em] text-gold">Your Ascend Profile</p><p className="mt-5 text-sm font-semibold text-forest/55">Today, you are:</p><h1 className="mt-4 font-serif text-7xl font-semibold leading-none sm:text-8xl">{profile.nameZh}</h1><p className="mt-4 text-2xl font-bold tracking-[0.12em]">{profile.nameEn}</p><h2 className="mt-8 text-sm font-bold tracking-[0.2em] text-gold">{profile.title}</h2><ul className="mt-5 flex flex-wrap gap-2">{profile.keywords.map((keyword) => <li className="border border-forest/15 bg-white px-4 py-2 text-sm font-semibold" key={keyword}>{keyword}</li>)}</ul><div className="mt-8 max-w-xl space-y-4 text-lg leading-8 text-forest/70">{profile.message.map((line) => <p key={line}>{line}</p>)}</div><p className="mt-9 text-sm font-bold uppercase tracking-[0.16em] text-gold">Recommended tea · {profile.nameEn}</p><p className="mt-2 font-serif text-2xl font-semibold">Born to Ascend</p>
      <div className="mt-9 flex flex-wrap gap-3"><button className="focus-ring min-h-12 rounded-full bg-forest px-7 font-bold text-white disabled:opacity-50" disabled={generating || !referralCode} onClick={generate} type="button">{generating ? "Creating…" : cardBlob ? "Recreate My Card" : "Create My Card"}</button><Link className="focus-ring inline-flex min-h-12 items-center rounded-full border border-forest/20 px-7 font-bold" href={`/${locale}/ascend`} onClick={() => trackAscendEvent("ascend_try_again", { locale, profile: profile.slug })}>Try Again</Link><Link className="focus-ring inline-flex min-h-12 items-center rounded-full border border-forest/20 px-7 font-bold" href={`/${locale}/menu`} onClick={() => trackAscendEvent("ascend_menu_clicked", { locale, profile: profile.slug })}>Explore the Menu</Link></div></div>
    </div></section>
    {cardBlob && previewUrl ? <section className="bg-[#071d18] px-5 py-16 text-white md:px-8"><div className="mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-[0.75fr_1fr]"><div className="mx-auto w-full max-w-[340px]"><Image alt={`Generated ${profile.nameEn} Ascend Profile social card preview`} className="h-auto w-full" height={1920} src={previewUrl} unoptimized width={1080} /></div><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Ready to share</p><h2 className="mt-4 font-serif text-5xl font-semibold">Your profile, made visible.</h2><div aria-live="polite" className="mt-5 min-h-6 text-sm text-white/65">{status}</div><div className="mt-7 flex flex-wrap gap-3"><a className="focus-ring inline-flex min-h-12 items-center rounded-full bg-gold px-6 font-bold text-[#071d18]" download={`qing-yun-jian-ascend-profile-${activeProfile.slug}.png`} href={previewUrl} onClick={() => { setStatus("Your Ascend Card is ready."); trackAscendEvent("ascend_download_card", { locale, profile: activeProfile.slug, referral_code: referralCode ?? undefined }); }}>Download Card</a><button className="focus-ring min-h-12 rounded-full border border-white/30 px-6 font-bold" onClick={share} type="button">Share Card</button><button className="focus-ring min-h-12 rounded-full border border-white/30 px-6 font-bold" onClick={copyCaption} type="button">Copy Caption</button></div><p className="mt-7 max-w-lg text-sm leading-7 text-white/55">On iPhone, save the image, then add it to Instagram Story, TikTok, Xiaohongshu or WhatsApp Status. The available share destinations depend on your device.</p></div></div></section> : <p aria-live="polite" className="sr-only">{status}</p>}
  </main>;
}
