import Link from "next/link";
import { TornPage } from "@/components/chrome/TornPage";

export default function NotFound() {
  return (
    <TornPage title="This page is missing">
      <p>It may have been deleted, or the link is wrong. Saved readings are removed after 30 days unless they were pinned.</p>
      <Link className="btn btn-primary" href="/">
        Read a document
      </Link>
    </TornPage>
  );
}
