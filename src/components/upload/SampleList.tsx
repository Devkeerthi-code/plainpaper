"use client";

import { useState } from "react";
import { useToast } from "@/components/toast/ToastProvider";

const SAMPLES = [
  { file: "offer-northwind.pdf", title: "Offer letter · Northwind", note: "Bond, 90-day notice" },
  { file: "offer-bluefern.pdf", title: "Offer letter · Bluefern", note: "Stock options, no bond" },
  { file: "rent-greenview.pdf", title: "Rent agreement · Greenview", note: "11-month lock-in" },
  { file: "rent-lakeside.pdf", title: "Rent agreement · Lakeside", note: "Deposit and repairs" },
  { file: "insurance-carewell.pdf", title: "Health policy · Carewell", note: "20% co-pay" },
  { file: "insurance-sunrise.pdf", title: "Health policy · Sunrise", note: "Waiting periods" },
] as const;

/** Fictional documents that go through the exact same reading flow as a real upload. */
export function SampleList({ onFile }: { onFile: (file: File, label: string) => void }) {
  const toast = useToast();
  const [loading, setLoading] = useState<string | null>(null);

  const open = async (name: string, title: string) => {
    setLoading(name);
    try {
      const res = await fetch(`/samples/${name}`);
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      onFile(new File([blob], name, { type: "application/pdf" }), `Fictional sample · ${title}`);
    } catch {
      toast("We couldn't open that sample. Check your connection and try again.", { type: "error" });
    } finally {
      setLoading(null);
    }
  };

  return (
    <section className="samples" aria-labelledby="samples-title">
      <div className="samples-head">
        <h2 id="samples-title" className="section-label">
          No document handy? Try a fictional sample
        </h2>
        <span className="badge badge-demo">Fictional sample</span>
      </div>
      <ul className="samples-list">
        {SAMPLES.map((s) => (
          <li key={s.file}>
            <button type="button" className="sample-btn" onClick={() => open(s.file, s.title)} disabled={loading !== null} aria-busy={loading === s.file}>
              <strong>{s.title}</strong>
              <small>{loading === s.file ? "Opening…" : s.note}</small>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
