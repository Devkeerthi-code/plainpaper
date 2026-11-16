"use client";

import { useCallback, useEffect, useState } from "react";

export type SpeechState = "idle" | "speaking" | "paused";

export type SpeakResult = "ok" | "unsupported" | "no-voice";

function voiceFor(lang: string): SpeechSynthesisVoice | null {
  const prefix = lang.split("-")[0]!.toLowerCase();
  const voices = window.speechSynthesis.getVoices();
  const norm = (v: SpeechSynthesisVoice) => v.lang.replace("_", "-").toLowerCase();
  return voices.find((v) => norm(v) === lang.toLowerCase()) ?? voices.find((v) => norm(v).startsWith(prefix)) ?? null;
}

/** Browser speech synthesis with pause/resume/stop. Stops itself on unmount. */
export function useSpeech() {
  const [state, setState] = useState<SpeechState>("idle");

  const stop = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    setState("idle");
  }, []);

  useEffect(() => {
    if ("speechSynthesis" in window) window.speechSynthesis.getVoices();
    return () => {
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  const speak = useCallback((text: string, lang: string): SpeakResult => {
    if (!("speechSynthesis" in window)) return "unsupported";
    const synth = window.speechSynthesis;
    synth.cancel();
    const voice = voiceFor(lang);
    const anyVoices = synth.getVoices().length > 0;
    if (!voice && anyVoices && !lang.startsWith("en")) return "no-voice";
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = 0.95;
    if (voice) u.voice = voice;
    u.onend = () => setState("idle");
    u.onerror = () => setState("idle");
    synth.speak(u);
    setState("speaking");
    return "ok";
  }, []);

  const pause = useCallback(() => {
    window.speechSynthesis.pause();
    setState("paused");
  }, []);

  const resume = useCallback(() => {
    window.speechSynthesis.resume();
    setState("speaking");
  }, []);

  return { state, speak, pause, resume, stop };
}
