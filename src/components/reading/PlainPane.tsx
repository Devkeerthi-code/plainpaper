"use client";

import type { AnalysisContent, Language } from "@/lib/documents/types";
import { groupFields } from "@/lib/client/present";
import { speechText, type LocalizedReading } from "@/lib/client/localize";
import { ADVICE_TEXT } from "@/components/chrome/BrandMark";
import { AsksSection, FlagsSection } from "./FlagsSection";
import { FactsSection } from "./FactsSection";
import { PlainTools } from "./PlainTools";
import { SummarySection } from "./SummarySection";
import { useReading } from "./ReadingContext";

interface Props {
  content: AnalysisContent;
  reading: LocalizedReading;
  pendingLang: Language | null;
  onLang: (lang: Language) => void;
  keep: string;
  canSave: boolean;
  onSave: () => void;
  onOpenPay?: () => void;
}

export function PlainPane({ content, reading, pendingLang, onLang, keep, canSave, onSave, onOpenPay }: Props) {
  const { plainRef } = useReading();
  return (
    <div className="plain-pane">
      <div className="plain-inner" ref={plainRef}>
        <PlainTools lang={reading.lang} pendingLang={pendingLang} onLang={onLang} speechText={speechText(reading)} docType={content.docType} />
        <div className="plain" aria-busy={pendingLang !== null} key={reading.lang}>
          <p className="keep">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="8.5" />
              <path d="M12 7.5V12l3 2" />
            </svg>
            <span>
              {keep}{" "}
              {canSave && (
                <button type="button" className="text-btn" onClick={onSave}>
                  Save it
                </button>
              )}
            </span>
          </p>
          {reading.lang !== "en" && (
            <p className="lang-note">The summary, warnings and questions are translated. Key facts and the original stay in English.</p>
          )}
          <SummarySection points={reading.summary} lang={reading.lang} />
          <FactsSection groups={groupFields(content)} flags={content.flags} onOpenPay={onOpenPay} />
          <FlagsSection flags={reading.flags} lang={reading.lang} />
          <AsksSection flags={reading.flags} lang={reading.lang} />
          <div className="not-advice">
            <strong>{ADVICE_TEXT}</strong> PlainPaper explains what the document says. If something worries you, ask about it in writing before you sign.
          </div>
        </div>
      </div>
    </div>
  );
}
