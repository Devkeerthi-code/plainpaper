import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ReadingView } from "@/components/reading/ReadingView";
import { getAnalysis } from "@/lib/analyses";
import { getViewer } from "../../_lib/viewer";

export const metadata: Metadata = { title: "Saved reading", robots: { index: false } };

export default async function SavedReadingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getViewer();
  if (!viewer) redirect(`/login?next=${encodeURIComponent(`/read/${id}`)}`);
  const analysis = await getAnalysis(viewer.id, id);
  if (!analysis) notFound();
  const { pinned, expiresAt, ...content } = analysis;
  return <ReadingView source={{ kind: "saved", id, pinned, expiresAt }} content={content} />;
}
