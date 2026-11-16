import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ReadingsList } from "@/components/readings/ReadingsList";
import { listAnalyses } from "@/lib/analyses";
import { getViewer } from "../_lib/viewer";

export const metadata: Metadata = { title: "My readings", robots: { index: false } };

export default async function ReadingsPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login?next=/readings");
  const items = await listAnalyses(viewer.id);
  return (
    <div className="page-wrap">
      <div className="readings-head">
        <div>
          <p className="eyebrow">My readings</p>
          <h1 className="h2 serif" style={{ marginTop: 12 }}>
            Saved readings
          </h1>
          <p className="muted" style={{ marginTop: 8 }}>
            Logged in as {viewer.email}. Each reading is deleted 30 days after you save it, unless you pin it.
          </p>
        </div>
      </div>
      <ReadingsList initial={items} />
    </div>
  );
}
