"use client";

import Link from "next/link";
import { DOC_TYPE_LABELS, type DocType } from "@/lib/documents/types";

export type ReadingTab = "read" | "pay";

interface Props {
  title: string;
  docType: DocType;
  sample: boolean;
  tab: ReadingTab;
  onTab: (tab: ReadingTab) => void;
  saved: boolean;
  pinned: boolean;
  pending: "save" | "pin" | "delete" | null;
  compareHref: string;
  onSave: () => void;
  onPin: () => void;
  onDelete: () => void;
}

const Icon = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d={d} />
  </svg>
);

export function DocBar(p: Props) {
  const tabs: { id: ReadingTab; label: string }[] = [{ id: "read", label: "Plain reading" }];
  if (p.docType === "OFFER_LETTER") tabs.push({ id: "pay", label: "In-hand pay" });

  return (
    <div className="docbar">
      <div className="docbar-title">
        <span className={`badge ${p.sample ? "badge-demo" : "badge-type"}`}>{p.sample ? "Fictional sample" : DOC_TYPE_LABELS[p.docType]}</span>
        <h1 className="docbar-name" title={p.title}>
          {p.title}
        </h1>
      </div>
      {tabs.length > 1 && (
        <div className="doc-tabs" role="tablist" aria-label="This document">
          {tabs.map((t) => (
            <button key={t.id} type="button" role="tab" id={`tab-${t.id}`} aria-selected={p.tab === t.id} aria-controls={`panel-${t.id}`} onClick={() => p.onTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
      )}
      <div className="docbar-actions">
        {p.saved ? (
          <button type="button" className="btn btn-small btn-ghost" aria-label="Pin this reading" aria-pressed={p.pinned} onClick={p.onPin} disabled={p.pending !== null}>
            {p.pending === "pin" ? <span className="spin" aria-hidden="true" /> : <Icon d="M9 4h6l-1 6 4 3v2h-5v5l-1 1-1-1v-5H6v-2l4-3z" />}
            <span className="btn-label">{p.pinned ? "Pinned" : "Pin"}</span>
          </button>
        ) : (
          <button type="button" className="btn btn-small btn-primary" aria-label="Save this reading" onClick={p.onSave} disabled={p.pending !== null}>
            {p.pending === "save" ? <span className="spin" aria-hidden="true" /> : <Icon d="M6 4h12v16l-6-4-6 4z" />}
            <span className="btn-label">Save this reading</span>
          </button>
        )}
        <Link className="btn btn-small btn-ghost" href={p.compareHref} aria-label="Compare with another reading">
          <Icon d="M4 6h7v12H4zM13 6h7v12h-7z" />
          <span className="btn-label">Compare with another…</span>
        </Link>
        <button type="button" className="btn btn-small btn-ghost" onClick={p.onDelete} disabled={p.pending !== null} aria-label="Delete this reading">
          <Icon d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
          <span className="btn-label">Delete</span>
        </button>
      </div>
    </div>
  );
}
