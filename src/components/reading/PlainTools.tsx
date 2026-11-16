"use client";

import { useEffect } from "react";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useToast } from "@/components/toast/ToastProvider";
import { useSpeech } from "@/hooks/useSpeech";
import { LANGUAGE_NAMES, LANGUAGES, type DocType, type Language } from "@/lib/documents/types";
import { trackUsage } from "@/lib/client/usage";

const OPTIONS = LANGUAGES.map((l) => ({ value: l, label: LANGUAGE_NAMES[l].native, lang: l }));

interface Props {
  lang: Language;
  pendingLang: Language | null;
  onLang: (lang: Language) => void;
  speechText: string;
  docType: DocType;
}

export function PlainTools({ lang, pendingLang, onLang, speechText, docType }: Props) {
  const toast = useToast();
  const { state, speak, pause, resume, stop } = useSpeech();

  useEffect(() => stop(), [lang, stop]);

  const onSpeak = () => {
    if (state === "speaking") return pause();
    if (state === "paused") return resume();
    const result = speak(speechText, LANGUAGE_NAMES[lang].speech);
    if (result === "unsupported") toast("This browser can't read aloud. Try Chrome or Safari on your phone.", { type: "error" });
    else if (result === "no-voice")
      toast(`This device has no ${LANGUAGE_NAMES[lang].english} voice installed. You can add one in your phone's language or speech settings.`, { type: "info", duration: 8000 });
    else trackUsage("read_aloud", docType);
  };

  const speakLabel = state === "speaking" ? "Pause" : state === "paused" ? "Resume" : "Read aloud";

  return (
    <div className="plain-tools">
      <SegmentedControl label="Language of the plain reading" options={OPTIONS} value={pendingLang ?? lang} onChange={onLang} disabled={pendingLang !== null} />
      <div className="speak">
        <button type="button" className="btn btn-small btn-ghost" onClick={onSpeak} aria-pressed={state !== "idle"}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            {state === "speaking" ? (
              <path d="M9 6v12M15 6v12" />
            ) : (
              <>
                <path d="M11 5 6 9H3v6h3l5 4z" />
                <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
              </>
            )}
          </svg>
          {speakLabel}
        </button>
        {state !== "idle" && (
          <button type="button" className="btn btn-small btn-ghost" onClick={stop}>
            Stop
          </button>
        )}
      </div>
      {pendingLang && (
        <p className="tools-status" role="status">
          <span className="spin" aria-hidden="true" />
          Translating into {LANGUAGE_NAMES[pendingLang].english}…
        </p>
      )}
    </div>
  );
}
