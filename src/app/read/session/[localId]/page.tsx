import type { Metadata } from "next";
import { SessionReading } from "@/components/reading/SessionReading";

export const metadata: Metadata = { title: "Your reading", robots: { index: false } };

export default async function SessionReadingPage({ params }: { params: Promise<{ localId: string }> }) {
  const { localId } = await params;
  return <SessionReading localId={localId} />;
}
