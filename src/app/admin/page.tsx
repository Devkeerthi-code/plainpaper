import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { adminEmails } from "@/lib/env";
import { getUsageStats } from "@/lib/stats";
import { getViewer } from "../_lib/viewer";

export const metadata: Metadata = { title: "Usage", robots: { index: false } };
export const dynamic = "force-dynamic";

const KIND_LABELS: Record<string, string> = {
  document_read: "Documents read",
  analysis_created: "Plain readings written",
  analysis_saved: "Readings saved",
  translation: "Translations",
  calculator_used: "In-hand calculator used",
  compare_used: "Comparisons",
  read_aloud: "Read aloud",
  guest_start: "Started without an account",
  signup: "Sign-ups",
  delete_everything: "“Delete everything” used",
};

function isAdmin(email: string): boolean {
  try {
    return adminEmails().has(email.toLowerCase());
  } catch {
    return false;
  }
}

function KindTable({ caption, rows }: { caption: string; rows: { kind: string; count: number }[] }) {
  return (
    <table className="data-table">
      <caption className="section-label" style={{ textAlign: "left", paddingBottom: 8 }}>
        {caption}
      </caption>
      <thead>
        <tr>
          <th scope="col">Action</th>
          <th scope="col" className="n">
            Count
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={2} className="faint">
              Nothing yet
            </td>
          </tr>
        ) : (
          rows.map((r) => (
            <tr key={r.kind}>
              <td>{KIND_LABELS[r.kind] ?? r.kind}</td>
              <td className="n">{r.count.toLocaleString("en-IN")}</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}

/** Aggregate, anonymous counts for the people listed in ADMIN_EMAILS. Everyone else gets a 404. */
export default async function AdminPage() {
  const viewer = await getViewer();
  if (!viewer || !isAdmin(viewer.email)) notFound();
  const stats = await getUsageStats();
  return (
    <div className="page-wrap">
      <header className="page-head">
        <p className="eyebrow">Usage</p>
        <h1 className="h1">How PlainPaper is being used</h1>
        <p className="lede">Anonymous counts only: no names, emails or document text.</p>
      </header>
      <div className="stat-grid">
        <div className="stat">
          <span className="stat-n">{stats.accounts.toLocaleString("en-IN")}</span>
          <span className="stat-l">Accounts</span>
        </div>
        <div className="stat">
          <span className="stat-n">{stats.savedReadings.toLocaleString("en-IN")}</span>
          <span className="stat-l">Saved readings right now</span>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 48, marginTop: 48 }}>
        <KindTable caption="Last 30 days" rows={stats.last30Days} />
        <KindTable caption="All time" rows={stats.allTime} />
      </div>
    </div>
  );
}
