"use client";

import Link from "next/link";
import { TornPage } from "@/components/chrome/TornPage";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <TornPage title="Something tore">
      <p>This page didn’t load properly. Try again in a moment; if it keeps happening, the service may be busy.</p>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
        <button type="button" className="btn btn-primary" onClick={reset}>
          Try again
        </button>
        <Link className="btn btn-quiet" href="/">
          Go home
        </Link>
      </div>
    </TornPage>
  );
}
