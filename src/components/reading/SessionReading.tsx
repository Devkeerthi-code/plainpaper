"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSessionReading, type StoredReading } from "@/lib/client/session-store";
import { TornPage } from "@/components/chrome/TornPage";
import { ReadingSkeleton } from "./ReadingSkeleton";
import { ReadingView } from "./ReadingView";

/** A "try without an account" reading, loaded from this tab's sessionStorage. */
export function SessionReading({ localId }: { localId: string }) {
  const [state, setState] = useState<{ status: "loading" } | { status: "missing" } | { status: "ready"; record: StoredReading }>({ status: "loading" });

  useEffect(() => {
    const record = getSessionReading(localId);
    setState(record ? { status: "ready", record } : { status: "missing" });
  }, [localId]);

  if (state.status === "loading") return <ReadingSkeleton />;
  if (state.status === "missing") {
    return (
      <TornPage title="This reading is gone">
        <p>Readings you haven’t saved live only in the tab where you made them, and disappear when it closes. Your file was never kept.</p>
        <Link className="btn btn-primary" href="/">
          Read a document again
        </Link>
      </TornPage>
    );
  }
  return <ReadingView source={{ kind: "session", localId }} content={state.record.content} />;
}
