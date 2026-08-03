"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ascendQuestions } from "@/lib/ascend/scoring";
import { scoreAscendAnswers } from "@/lib/ascend/scoring";
import { trackAscendEvent } from "@/lib/ascend/analytics";
import { createAscendReferral, recordAscendReferral, REFERRAL_CODE_PATTERN } from "@/lib/ascend/referrals";

export function AscendQuiz({ locale }: { locale: string }) {
  const router = useRouter();
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [completing, setCompleting] = useState(false);
  const question = ascendQuestions[step];
  const selected = answers[step];

  useEffect(() => {
    const referralCode = new URLSearchParams(window.location.search).get("ref");
    if (!referralCode || !REFERRAL_CODE_PATTERN.test(referralCode)) return;
    sessionStorage.setItem("qyj-ascend-source-ref", referralCode);
    const visitKey = `qyj-ascend-visited-${referralCode}`;
    if (sessionStorage.getItem(visitKey)) return;
    sessionStorage.setItem(visitKey, "1");
    void recordAscendReferral("visit", referralCode)
      .then(() => trackAscendEvent("ascend_referral_visit", { locale, referral_code: referralCode }))
      .catch(() => sessionStorage.removeItem(visitKey));
  }, [locale]);

  if (!started) return (
    <section className="flex min-h-[calc(100svh-80px)] items-center bg-[#071d18] px-5 py-16 text-white md:px-8">
      <div className="mx-auto w-full max-w-5xl text-center">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold">QING YUN JIAN</p>
        <h1 className="mt-6 font-serif text-5xl font-semibold leading-none sm:text-7xl md:text-8xl">THE ASCEND<br />TEA PROFILE</h1>
        <p className="mx-auto mt-7 max-w-xl text-xl leading-8 text-white/80">Discover the tea that matches who you are today.</p>
        <p className="mt-3 text-sm text-white/55">Five simple questions. One tea for this moment.</p>
        <button className="focus-ring mt-10 min-h-12 rounded-full bg-gold px-10 py-3 font-bold text-[#071d18] transition hover:-translate-y-0.5 hover:bg-[#ddb86d]" onClick={() => { setStarted(true); trackAscendEvent("ascend_start_quiz", { locale }); }} type="button">Begin</button>
        <p className="mx-auto mt-8 max-w-lg text-xs leading-6 text-white/45">A light-hearted tea recommendation experience, not a psychological assessment.</p>
      </div>
    </section>
  );

  function choose(answer: string) {
    setAnswers((current) => { const next = current.slice(0, step); next[step] = answer; return next; });
  }

  async function next() {
    if (!selected) return;
    trackAscendEvent("ascend_question_completed", { locale });
    if (step < ascendQuestions.length - 1) setStep(step + 1);
    else {
      setCompleting(true);
      const profile = scoreAscendAnswers(answers);
      trackAscendEvent("ascend_complete_quiz", { locale, profile });
      const sourceReferral = sessionStorage.getItem("qyj-ascend-source-ref");
      if (sourceReferral && REFERRAL_CODE_PATTERN.test(sourceReferral)) {
        const completionKey = `qyj-ascend-completed-${sourceReferral}`;
        if (!sessionStorage.getItem(completionKey)) {
          sessionStorage.setItem(completionKey, "1");
          try {
            const completion = await recordAscendReferral("complete", sourceReferral);
            trackAscendEvent("ascend_referral_completion", { locale, profile, referral_code: sourceReferral });
            if (completion.unlockedReward) trackAscendEvent("ascend_reward_unlock", { locale, profile, referral_code: sourceReferral, reward: completion.unlockedReward });
          } catch { sessionStorage.removeItem(completionKey); }
        }
      }
      sessionStorage.setItem("qyj-ascend-profile", profile);
      try {
        const created = await createAscendReferral(profile);
        router.push(`/${locale}/ascend/result?profile=${profile}${created.referralCode ? `&rid=${created.referralCode}` : ""}`);
      } catch {
        router.push(`/${locale}/ascend/result?profile=${profile}`);
      }
    }
  }

  return (
    <section className="min-h-[calc(100svh-80px)] bg-paper px-5 py-12 text-forest md:px-8 md:py-20">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-[0.16em] text-forest/50"><span>Question {step + 1}</span><span>{step + 1} of {ascendQuestions.length}</span></div>
        <div className="mt-4 h-1 overflow-hidden rounded-full bg-forest/10"><div className="h-full bg-gold transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${((step + 1) / ascendQuestions.length) * 100}%` }} /></div>
        <fieldset className="mt-12"><legend className="font-serif text-4xl font-semibold leading-tight sm:text-5xl">{question.prompt}</legend><div className="mt-9 grid gap-3 sm:grid-cols-2">{question.options.map(([value, label]) => <button aria-pressed={selected === value} className={`focus-ring min-h-16 border px-6 py-4 text-left font-semibold transition motion-reduce:transition-none ${selected === value ? "border-forest bg-forest text-white" : "border-forest/15 bg-white hover:border-forest/45"}`} key={value} onClick={() => choose(value)} type="button">{label}</button>)}</div></fieldset>
        <div className="mt-10 flex items-center justify-between gap-4"><button className="focus-ring min-h-12 px-2 font-bold text-forest/60 disabled:opacity-30" disabled={step === 0 || completing} onClick={() => setStep(step - 1)} type="button">Back</button><button className="focus-ring min-h-12 rounded-full bg-gold px-8 font-bold text-[#071d18] disabled:cursor-not-allowed disabled:opacity-35" disabled={!selected || completing} onClick={() => void next()} type="button">{completing ? "Preparing…" : step === ascendQuestions.length - 1 ? "See My Profile" : "Next"}</button></div>
        <p className="mt-12 text-center text-xs leading-6 text-forest/45">Your answers are used only to create today&apos;s recommendation and are not stored in this version.</p>
      </div>
    </section>
  );
}
