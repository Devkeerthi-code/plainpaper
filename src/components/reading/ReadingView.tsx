"use client";

import { useMemo, useState } from "react";
import { AdviceStrip } from "@/components/chrome/BrandMark";
import { PayCalculator } from "@/components/pay/PayCalculator";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { keepLine, readingRef, useReadingActions, useTranslations, type ReadingSource } from "@/hooks/useReadingActions";
import type { AnalysisContent } from "@/lib/documents/types";
import { buildClauseMap, isFictionalSample } from "@/lib/client/present";
import { localize } from "@/lib/client/localize";
import { prefillFromContent } from "@/components/pay/prefill";
import { DocBar, type ReadingTab } from "./DocBar";
import { OriginalPane } from "./OriginalPane";
import { PlainPane } from "./PlainPane";
import { ReadingProvider } from "./ReadingContext";

interface Props {
  source: ReadingSource;
  content: AnalysisContent;
}

/** The signature screen: the original on the desk, the plain version beside it, linked both ways. */
export function ReadingView({ source, content }: Props) {
  const [tab, setTab] = useState<ReadingTab>("read");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const actions = useReadingActions(source, content);
  const { lang, pendingLang, translations, choose } = useTranslations(source, content);

  const clauseMap = useMemo(() => buildClauseMap(content.pages), [content.pages]);
  const sample = useMemo(() => isFictionalSample(content.pages), [content.pages]);
  const reading = useMemo(() => localize(content, lang, translations[lang]), [content, lang, translations]);
  const plainRefs = useMemo(() => {
    const ids = new Set<string>();
    content.summary.forEach((p) => p.clauseIds.forEach((id) => ids.add(id)));
    Object.values(content.fields.scalars).forEach((l) => l && ids.add(l.clauseId));
    Object.values(content.fields.lists).forEach((ls) => ls.forEach((l) => ids.add(l.clauseId)));
    content.flags.forEach((f) => f.clauseId && ids.add(f.clauseId));
    return ids;
  }, [content]);

  const saved = source.kind === "saved";
  const keep = saved ? keepLine(actions.pinned, actions.expiresAt) : "Not saved. This reading disappears when you close this tab.";

  return (
    <ReadingProvider clauseMap={clauseMap}>
      <DocBar
        title={content.title}
        docType={content.docType}
        sample={sample}
        tab={tab}
        onTab={setTab}
        saved={saved}
        pinned={actions.pinned}
        pending={actions.pending}
        compareHref={`/compare?a=${readingRef(source)}`}
        onSave={actions.save}
        onPin={actions.togglePin}
        onDelete={() => setConfirmDelete(true)}
      />
      {tab === "read" ? (
        <section className="read" id="panel-read" aria-label="Plain reading" role={content.docType === "OFFER_LETTER" ? "tabpanel" : undefined}>
          <OriginalPane pages={content.pages} flags={reading.flags} lang={reading.lang} plainRefs={plainRefs} sample={sample} />
          <PlainPane
            content={content}
            reading={reading}
            pendingLang={pendingLang}
            onLang={choose}
            keep={keep}
            canSave={!saved}
            onSave={actions.save}
            onOpenPay={content.docType === "OFFER_LETTER" ? () => setTab("pay") : undefined}
          />
        </section>
      ) : (
        <section id="panel-pay" role="tabpanel" aria-labelledby="tab-pay" className="in-reading">
          <PayCalculator prefill={prefillFromContent(content, clauseMap)} />
        </section>
      )}
      <AdviceStrip />
      <ConfirmDialog
        open={confirmDelete}
        title={saved ? "Delete this reading?" : "Remove this reading?"}
        confirmLabel={saved ? "Delete it" : "Remove it"}
        pending={actions.pending === "delete"}
        onClose={() => setConfirmDelete(false)}
        onConfirm={actions.remove}
      >
        <p>
          {saved
            ? "This removes the plain reading and the document's text from our servers. You can't undo this."
            : "This removes the reading from this tab. Nothing from it is stored anywhere else."}
        </p>
      </ConfirmDialog>
    </ReadingProvider>
  );
}
