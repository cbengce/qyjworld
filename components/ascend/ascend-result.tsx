"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createAscendCard } from "@/lib/ascend/card";
import { ascendCardVisuals } from "@/lib/ascend/card-visuals";
import { ascendProfiles, isAscendProfileSlug } from "@/lib/ascend/profiles";
import { trackAscendEvent } from "@/lib/ascend/analytics";
import { createAscendReferral, recordAscendReferral, REFERRAL_CODE_PATTERN } from "@/lib/ascend/referrals";
import { buildShareCaption } from "@/lib/ascend/share";

function shareUrlFor(locale: string, referralCode: string | null) {
  const safeLocale = locale === "zh" ? "zh" : "en";
  return referralCode ? `https://qyjworld.com/${safeLocale}/ascend?ref=${referralCode}` : `https://qyjworld.com/${safeLocale}/ascend`;
}

function isAppleMobileBrowser() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const textArea = document.createElement("textarea");
  textArea.value = value;
  textArea.style.position = "fixed";
  textArea.style.opacity = "0";
  document.body.appendChild(textArea);
  textArea.select();
  const copied = document.execCommand("copy");
  textArea.remove();
  if (!copied) throw new Error("Clipboard access is unavailable.");
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
      .catch(() => setStatus("Referral features are temporarily unavailable. You can still create your card."));
  }, [profile, referralCode]);
  const shareUrl = useMemo(() => shareUrlFor(locale, referralCode), [locale, referralCode]);
  const caption = useMemo(() => buildShareCaption(shareUrl), [shareUrl]);

  if (!profile) return <main className="grid min-h-[70svh] place-items-center bg-paper px-5 text-center"><div><h1 className="font-serif text-5xl font-semibold text-forest">Your profile is waiting.</h1><p className="mt-5 text-forest/60">Complete the five questions to discover today&apos;s tea.</p><Link className="focus-ring mt-8 inline-flex min-h-12 items-center rounded-full bg-forest px-7 font-bold text-white" href={`/${locale}/ascend`}>Begin the profile</Link></div></main>;
  const activeProfile = profile;

  async function generate() {
    setGenerating(true); setStatus("");
    try {
      const blob = await createAscendCard(activeProfile, referralCode);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setCardBlob(blob);
      setPreviewUrl(URL.createObjectURL(blob));
      setStatus(referralCode ? "Your Ascend Card is ready." : "Your card is ready. Referral features are temporarily unavailable.");
      trackAscendEvent("ascend_card_generated", { locale, profile: activeProfile.slug, referral_code: referralCode ?? undefined });
    } catch { setStatus("Card creation failed. Please try again."); }
    finally { setGenerating(false); }
  }

  function cardFileName() {
    const edition = ascendCardVisuals[activeProfile.slug].edition.split("/")[0].trim();
    const title = activeProfile.nameEn.toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase()).replaceAll(" ", "-");
    return `QYJ-ASCEND-${edition}-${title}.png`;
  }

  function triggerDirectDownload() {
    if (!cardBlob) return;
    const url = URL.createObjectURL(cardBlob); const link = document.createElement("a");
    link.href = url; link.download = cardFileName();
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }

  async function download() {
    if (!cardBlob) return;
    const file = new File([cardBlob], cardFileName(), { type: "image/png" });
    try {
      if (isAppleMobileBrowser()) {
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: "My QING YUN JIAN ASCEND Card" });
          setStatus("Share sheet opened. Choose Save Image to keep your card.");
        } else {
          const imageUrl = URL.createObjectURL(cardBlob);
          window.open(imageUrl, "_blank", "noopener,noreferrer");
          setTimeout(() => URL.revokeObjectURL(imageUrl), 60_000);
          setStatus("Your card opened in a new tab. Touch and hold the image to save it.");
        }
      } else {
        triggerDirectDownload();
        setStatus("Card downloaded successfully.");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setStatus("Download failed — please try again.");
      return;
    }
    trackAscendEvent("ascend_download_card", { locale, profile: activeProfile.slug, referral_code: referralCode ?? undefined });
  }

  async function share() {
    if (!cardBlob) return;
    const file = new File([cardBlob], cardFileName(), { type: "image/png" });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], text: caption, url: shareUrl, title: "My QING YUN JIAN ASCEND Card" });
        setStatus("Share sheet opened.");
        if (referralCode) void recordAscendReferral("share", referralCode);
        trackAscendEvent("ascend_share_card", { locale, profile: activeProfile.slug, referral_code: referralCode ?? undefined });
        return;
      } catch (error) { if (error instanceof DOMException && error.name === "AbortError") return; }
    }
    if (navigator.share) {
      try {
        triggerDirectDownload();
        await navigator.share({ text: caption, url: shareUrl, title: "My QING YUN JIAN ASCEND Card" });
        setStatus("Share sheet opened. Your card is also prepared for download.");
        if (referralCode) void recordAscendReferral("share", referralCode);
        trackAscendEvent("ascend_share_card", { locale, profile: activeProfile.slug, referral_code: referralCode ?? undefined });
        return;
      } catch (error) { if (error instanceof DOMException && error.name === "AbortError") return; }
    }
    try {
      triggerDirectDownload();
      await copyText(caption);
      if (referralCode) void recordAscendReferral("share", referralCode);
      trackAscendEvent("ascend_share_card", { locale, profile: activeProfile.slug, referral_code: referralCode ?? undefined });
      setStatus("Sharing is not supported in this browser; your card was downloaded and the caption was copied. Open Instagram, TikTok or Xiaohongshu to post it.");
    } catch {
      setStatus("Sharing is not supported in this browser; your card has been prepared for download.");
    }
  }

  async function copyLink() {
    try {
      await copyText(shareUrl);
      setStatus("Referral link copied.");
      trackAscendEvent("ascend_link_copied", { locale, profile: activeProfile.slug, referral_code: referralCode ?? undefined });
    } catch { setStatus("The link could not be copied. Please copy it from your browser address bar."); }
  }

  async function copyCaption() {
    try {
      await copyText(caption);
      setStatus("Caption copied. Ready to paste into Instagram, TikTok or Xiaohongshu.");
      trackAscendEvent("ascend_caption_copied", { locale, profile: activeProfile.slug, referral_code: referralCode ?? undefined });
    } catch { setStatus("The caption could not be copied. Please try again."); }
  }

  return <main className="overflow-hidden bg-paper text-forest">
    <section className="px-5 py-14 md:px-8 md:py-20"><div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="relative aspect-[3/2] overflow-hidden bg-white shadow-soft"><Image alt={`${profile.nameEn} tea recommendation artwork`} className="object-contain" fill priority sizes="(min-width: 1024px) 45vw, 100vw" src={profile.image} title={`${profile.nameEn} by QING YUN JIAN`} /></div>
      <div><p className="text-xs font-bold uppercase tracking-[0.22em] text-gold">Your Ascend Profile</p><p className="mt-5 text-sm font-semibold text-forest/55">Today, you are:</p><h1 className="mt-4 font-serif text-7xl font-semibold leading-none sm:text-8xl">{profile.nameZh}</h1><p className="mt-4 text-2xl font-bold tracking-[0.12em]">{profile.nameEn}</p><h2 className="mt-8 text-sm font-bold tracking-[0.2em] text-gold">{profile.title}</h2><ul className="mt-5 flex flex-wrap gap-2">{profile.keywords.map((keyword) => <li className="border border-forest/15 bg-white px-4 py-2 text-sm font-semibold" key={keyword}>{keyword}</li>)}</ul><div className="mt-8 max-w-xl space-y-4 text-lg leading-8 text-forest/70">{profile.message.map((line) => <p key={line}>{line}</p>)}</div><p className="mt-9 text-sm font-bold uppercase tracking-[0.16em] text-gold">Recommended tea · {profile.nameEn}</p><p className="mt-2 font-serif text-2xl font-semibold">Born to Ascend</p>
      <div className="mt-9 flex flex-wrap gap-3"><button className="focus-ring min-h-12 rounded-full bg-forest px-7 font-bold text-white disabled:opacity-50" disabled={generating} onClick={generate} type="button">{generating ? "Creating My Card…" : "Create My Card"}</button><Link className="focus-ring inline-flex min-h-12 items-center rounded-full border border-forest/20 px-7 font-bold" href={`/${locale}/ascend`} onClick={() => trackAscendEvent("ascend_try_again", { locale, profile: profile.slug })}>Try Again</Link><Link className="focus-ring inline-flex min-h-12 items-center rounded-full border border-forest/20 px-7 font-bold" href={`/${locale}/menu`} onClick={() => trackAscendEvent("ascend_menu_clicked", { locale, profile: profile.slug })}>Explore the Menu</Link></div></div>
    </div></section>
    {cardBlob && previewUrl ? <section className="bg-[#071d18] px-5 py-16 text-white md:px-8"><div className="mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-[0.75fr_1fr]"><div className="mx-auto w-full max-w-[340px]"><Image alt={`Generated ${profile.nameEn} Ascend Profile social card preview`} className="h-auto w-full" height={1920} src={previewUrl} unoptimized width={1080} /></div><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Ready to share</p><h2 className="mt-4 font-serif text-5xl font-semibold">Your profile, made visible.</h2><div aria-live="polite" className="mt-5 min-h-6 text-sm text-white/65">{status}</div><div className="mt-7 flex flex-wrap gap-3"><button className="focus-ring min-h-12 rounded-full bg-gold px-6 font-bold text-[#071d18]" onClick={() => void download()} type="button">Download Card</button><button className="focus-ring min-h-12 rounded-full border border-white/30 px-6 font-bold" onClick={() => void copyCaption()} type="button">Copy Caption</button><button className="focus-ring min-h-12 rounded-full border border-white/30 px-6 font-bold" onClick={() => void copyLink()} type="button">Copy Link</button><button className="focus-ring min-h-12 rounded-full border border-white/30 px-6 font-bold" onClick={() => void share()} type="button">Share My ASCEND Card</button></div><div className="mt-7 max-w-lg text-sm leading-7 text-white/55"><p>For Instagram, TikTok and Xiaohongshu:</p><ol className="list-decimal pl-5"><li>Download your ASCEND Card.</li><li>Tap &quot;Copy Caption&quot;.</li><li>Paste everything into your post.</li></ol></div></div></div></section> : <p aria-live="polite" className="sr-only">{status}</p>}
  </main>;
}
