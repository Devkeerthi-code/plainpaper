"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useUploadFlow } from "@/hooks/useUploadFlow";
import { ConfirmType } from "./ConfirmType";
import { DropZone } from "./DropZone";
import { ReadingProgress } from "./ReadingProgress";
import { SampleList } from "./SampleList";

const READ_STEPS = (photos: boolean) => [
  { label: "Receiving your file", at: 0 },
  { label: photos ? "Reading the text in your photos" : "Reading the text on each page", at: 1800 },
  { label: "Splitting it into clauses", at: photos ? 12000 : 4500 },
];

const EXPLAIN_STEPS = [
  { label: "Finding the clauses that matter", at: 0 },
  { label: "Writing it in plain words", at: 4000 },
  { label: "Checking every point against your document", at: 9000 },
];

interface Props {
  loggedIn: boolean;
  /** Server-rendered landing copy, shown while nothing is being read. */
  hero: ReactNode;
  lower: ReactNode;
}

export function UploadFlow({ loggedIn, hero, lower }: Props) {
  const { stage, start, explain, cancel } = useUploadFlow(loggedIn);

  if (stage.kind === "reading") {
    return (
      <ReadingProgress
        title="Reading your document…"
        steps={READ_STEPS(stage.photos)}
        note={stage.photos ? "Photos take a little longer, up to 40 seconds. You can leave this tab open." : "Usually takes a few seconds."}
        onCancel={cancel}
      />
    );
  }
  if (stage.kind === "explaining") {
    return (
      <ReadingProgress
        title="Writing it in plain words…"
        steps={EXPLAIN_STEPS}
        note="Usually takes 10–20 seconds. Every point is checked against the words in your document."
        onCancel={cancel}
      />
    );
  }
  if (stage.kind === "confirm") {
    return (
      <ConfirmType
        fileLabel={stage.fileLabel}
        pages={stage.pages}
        detected={stage.detected}
        usedOcr={stage.usedOcr}
        error={stage.error}
        onConfirm={explain}
        onBack={cancel}
      />
    );
  }

  return (
    <div className="view-upload">
      <div className="land">
        {hero}
        <div>
          <DropZone onFiles={(files) => start(files)} />
          <GuestNote loggedIn={loggedIn} />
          <SampleList onFile={(file, label) => start([file], label)} />
        </div>
      </div>
      {lower}
    </div>
  );
}

function GuestNote({ loggedIn }: { loggedIn: boolean }) {
  return (
    <div className="guest">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        {loggedIn ? <path d="M6 4h12v16l-6-4-6 4z" /> : <path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6z" />}
      </svg>
      <p>
        {loggedIn ? (
          <>
            <strong>You can save what you read</strong>
            Saved readings are deleted after 30 days unless you pin them.
          </>
        ) : (
          <>
            <strong>Trying it without an account: nothing is kept</strong>
            The reading stays in this tab only and is gone when you close it.{" "}
            <Link className="link" href="/signup">
              Create an account
            </Link>{" "}
            to save readings for 30 days.
          </>
        )}
      </p>
    </div>
  );
}
