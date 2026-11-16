import type { Metadata } from "next";
import { AdviceStrip } from "@/components/chrome/BrandMark";
import { CompareView } from "@/components/compare/CompareView";
import { getViewer } from "../_lib/viewer";

export const metadata: Metadata = { title: "Compare two documents" };

type Search = Promise<{ a?: string | string[]; b?: string | string[] }>;
const one = (v: string | string[] | undefined) => (typeof v === "string" ? v.slice(0, 60) : undefined);

export default async function ComparePage({ searchParams }: { searchParams: Search }) {
  const [viewer, params] = await Promise.all([getViewer(), searchParams]);
  return (
    <div className="compare">
      <div className="compare-head">
        <p className="eyebrow">Compare</p>
        <h1 className="h2 serif">Side by side, line by line</h1>
        <p className="lede" style={{ marginTop: 12 }}>
          Two offers, two flats or two policies: pick readings of the same kind and see where they differ.
        </p>
      </div>
      <CompareView loggedIn={!!viewer} initialA={one(params.a)} initialB={one(params.b)} />
      <AdviceStrip />
    </div>
  );
}
