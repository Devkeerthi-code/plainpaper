import type { Metadata } from "next";
import Link from "next/link";
import { AdviceInline } from "@/components/chrome/BrandMark";

export const metadata: Metadata = { title: "Privacy, in plain words" };

const POINTS = [
  {
    title: "What we read",
    text: "The file you upload: a PDF, or photos of the pages. Photos are shrunk in your browser before they are sent. PlainPaper turns the file into text, splits it into clauses, and a reading service writes the plain-language version from that text.",
  },
  {
    title: "Your file is deleted after reading",
    text: "The file only exists in memory while it is being read. It is never written to disk or saved in our database. What you see afterwards is the text taken from it, not the file itself.",
  },
  {
    title: "Without an account, nothing is kept",
    text: "If you try PlainPaper without logging in, the reading is kept in this browser tab only. Close the tab and it is gone. Nothing about it is stored on our side.",
  },
  {
    title: "Text is kept only if you save it",
    text: "When you press “Save this reading”, the document’s text and the plain reading are stored in your account so you can come back to them.",
  },
  {
    title: "Saved readings are deleted after 30 days",
    text: "Every saved reading is deleted automatically 30 days after you save it. If you want to keep one longer, pin it. Unpinning starts a fresh 30 days.",
  },
  {
    title: "“Delete everything” works right away",
    text: "On My readings you can delete one reading, or everything at once. You can also delete your account in the same step. There is no waiting period.",
  },
  {
    title: "Usage counts are anonymous",
    text: "We count things like “a document was read” or “the calculator was used”, with no name, email, IP address or document text attached. That is how we know how many people PlainPaper helps. We don’t sell or share your documents with anyone.",
  },
  {
    title: "It is a reading aid, not advice",
    text: "PlainPaper explains what a document says and points out things worth asking about. It can miss things or get them wrong. Always check the original, and for big decisions talk to a lawyer, CA or insurance adviser.",
  },
];

export default function PrivacyPage() {
  return (
    <div className="page-wrap page-narrow">
      <header className="page-head">
        <p className="eyebrow">Privacy</p>
        <h1 className="h1">What happens to your document</h1>
        <p className="lede">Short version: your file is deleted as soon as it has been read, and the text is kept only if you choose to save it.</p>
      </header>
      <ol className="prose-list">
        {POINTS.map((p) => (
          <li key={p.title}>
            <div>
              <h2>{p.title}</h2>
              <p>{p.text}</p>
            </div>
          </li>
        ))}
      </ol>
      <div style={{ marginTop: 32, display: "grid", gap: 16 }}>
        <AdviceInline />
        <p className="small muted">
          <Link className="link" href="/readings">
            Go to My readings
          </Link>{" "}
          to delete what you have saved.
        </p>
      </div>
    </div>
  );
}
