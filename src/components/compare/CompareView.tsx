"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/toast/ToastProvider";
import { compareAnalyses } from "@/lib/compare/diff";
import { DOC_TYPE_LABELS, type AnalysisContent, type DocType, type SavedAnalysis } from "@/lib/documents/types";
import { api, errorMessage } from "@/lib/client/api";
import { formatDay } from "@/lib/client/present";
import { getSessionReading, listSessionReadings } from "@/lib/client/session-store";
import { trackUsage } from "@/lib/client/usage";
import { CompareTable } from "./CompareTable";

interface Candidate {
  ref: string;
  title: string;
  docType: DocType;
  createdAt: string;
  saved: boolean;
}

interface ListItem {
  id: string;
  title: string;
  docType: DocType;
  createdAt: string;
}

const SESSION_PREFIX = "session-";

async function loadContent(ref: string): Promise<AnalysisContent> {
  if (ref.startsWith(SESSION_PREFIX)) {
    const record = getSessionReading(ref.slice(SESSION_PREFIX.length));
    if (!record) throw new Error("That reading is no longer in this tab.");
    return record.content;
  }
  return (await api<{ analysis: SavedAnalysis }>(`/api/analyses/${encodeURIComponent(ref)}`)).analysis;
}

export function CompareView({ loggedIn, initialA, initialB }: { loggedIn: boolean; initialA?: string; initialB?: string }) {
  const router = useRouter();
  const toast = useToast();
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [a, setA] = useState(initialA ?? "");
  const [b, setB] = useState(initialB ?? "");
  const [pair, setPair] = useState<{ a: AnalysisContent; b: AnalysisContent } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const session: Candidate[] = listSessionReadings().map((r) => ({ ref: SESSION_PREFIX + r.localId, title: r.title, docType: r.docType, createdAt: r.createdAt, saved: false }));
    if (!loggedIn) return setCandidates(session);
    api<{ analyses: ListItem[] }>("/api/analyses")
      .then(({ analyses }) => setCandidates([...session, ...analyses.map((x) => ({ ref: x.id, title: x.title, docType: x.docType, createdAt: x.createdAt, saved: true }))]))
      .catch((err) => {
        toast(errorMessage(err), { type: "error" });
        setCandidates(session);
      });
  }, [loggedIn, toast]);

  const typeOfA = candidates?.find((c) => c.ref === a)?.docType;
  const forB = useMemo(() => (candidates ?? []).filter((c) => c.ref !== a && (!typeOfA || c.docType === typeOfA)), [a, candidates, typeOfA]);

  useEffect(() => {
    if (!a || !b || a === b) return setPair(null);
    let live = true;
    setLoading(true);
    Promise.all([loadContent(a), loadContent(b)])
      .then(([ca, cb]) => {
        if (!live) return;
        if (ca.docType !== cb.docType) {
          toast("Only documents of the same kind can be compared.", { type: "info" });
          return setPair(null);
        }
        setPair({ a: ca, b: cb });
        trackUsage("compare_used", ca.docType, `compare:${a}:${b}`);
      })
      .catch((err) => live && toast(err instanceof Error && !("status" in err) ? err.message : errorMessage(err), { type: "error" }))
      .finally(() => live && setLoading(false));
    router.replace(`/compare?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`, { scroll: false });
    return () => {
      live = false;
    };
  }, [a, b, router, toast]);

  const rows = useMemo(() => (pair ? compareAnalyses(pair.a, pair.b) : []), [pair]);
  const label = (c: Candidate) => `${c.title} · ${DOC_TYPE_LABELS[c.docType]} · ${c.saved ? "saved" : "this tab"} ${formatDay(c.createdAt)}`;

  if (candidates && candidates.length < 2) return <CompareEmpty count={candidates.length} loggedIn={loggedIn} />;

  return (
    <>
      <div className="pick">
        <div className="field">
          <label htmlFor="cmp-a">First reading</label>
          <select id="cmp-a" value={a} onChange={(e) => (setA(e.target.value), setB(""))} disabled={!candidates}>
            <option value="">{candidates ? "Choose a reading" : "Loading your readings…"}</option>
            {candidates?.map((c) => (
              <option key={c.ref} value={c.ref}>
                {label(c)}
              </option>
            ))}
          </select>
          <small>{typeOfA ? `Compared with other ${DOC_TYPE_LABELS[typeOfA].toLowerCase()}s` : " "}</small>
        </div>
        <span className="pick-vs" aria-hidden="true">
          and
        </span>
        <div className="field">
          <label htmlFor="cmp-b">Second reading</label>
          <select id="cmp-b" value={b} onChange={(e) => setB(e.target.value)} disabled={!a || forB.length === 0}>
            <option value="">{a && forB.length === 0 ? "No other reading of this kind yet" : "Choose a reading"}</option>
            {forB.map((c) => (
              <option key={c.ref} value={c.ref}>
                {label(c)}
              </option>
            ))}
          </select>
          <small>
            {a && forB.length === 0 ? (
              <Link className="link" href="/">
                Read another one first
              </Link>
            ) : (
              " "
            )}
          </small>
        </div>
      </div>
      {loading && <p className="muted small" role="status" style={{ marginTop: 24 }}>Lining them up…</p>}
      {pair && !loading && <CompareTable a={pair.a} b={pair.b} rows={rows} />}
    </>
  );
}

function CompareEmpty({ count, loggedIn }: { count: number; loggedIn: boolean }) {
  return (
    <div className="empty">
      <div className="empty-art" aria-hidden="true">
        <div className="ea-sheet ea-a">
          <i />
          <i />
          <i />
          <i />
        </div>
        <div className="ea-sheet ea-b">
          <span>+</span>
        </div>
      </div>
      <h2 className="h3">{count === 0 ? "Read two documents to see them side by side" : "Add a second document to compare"}</h2>
      <p className="muted">
        We’ll line up pay, bonds, notice periods, deposits or waiting periods row by row, and point out which one is kinder to you on each. Only documents of
        the same kind can be compared.
      </p>
      <Link className="btn btn-primary" href="/">
        {count === 0 ? "Read a document" : "Read another document"}
      </Link>
      {!loggedIn && <p className="muted small">Readings from this tab are listed here. Log in to compare saved ones too.</p>}
    </div>
  );
}
