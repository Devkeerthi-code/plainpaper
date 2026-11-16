import Link from "next/link";
import { UploadFlow } from "@/components/upload/UploadFlow";
import { getViewer } from "./_lib/viewer";

const TYPES = [
  { n: "01", title: "Job offer letter", text: "CTC against what actually lands in your account, service bonds, notice period, probation." },
  { n: "02", title: "Rent agreement", text: "Lock-in period, how much deposit you get back, yearly rent increase, who pays for repairs." },
  { n: "03", title: "Health insurance policy", text: "What isn't covered, waiting periods, co-pay, room-rent limits." },
];

function Hero() {
  return (
    <div className="land-copy">
      <p className="eyebrow">For offer letters, rent agreements and insurance policies</p>
      <h1 className="display">
        The fine print,{" "}
        <span className="mark-wrap">
          <span className="mark">made plain.</span>
        </span>
      </h1>
      <p className="lede">
        Upload the document you’ve been asked to sign. PlainPaper reads every clause first, then tells you in simple words what it says, what it
        costs you, and what to ask before you sign.
      </p>
      <ol className="how" aria-label="How it works">
        <li>
          <span className="how-n">1</span>Upload a PDF or photos of the pages
        </li>
        <li>
          <span className="how-n">2</span>Check what kind of document it is
        </li>
        <li>
          <span className="how-n">3</span>Read it side by side, in your language
        </li>
      </ol>
    </div>
  );
}

function Lower() {
  return (
    <div className="land-lower">
      <section aria-labelledby="types-title">
        <h2 id="types-title" className="section-label">
          What it reads today
        </h2>
        <ul className="type-list">
          {TYPES.map((t) => (
            <li key={t.n} className="type-card">
              <span className="type-n">{t.n}</span>
              <h3>{t.title}</h3>
              <p>{t.text}</p>
            </li>
          ))}
        </ul>
      </section>
      <section className="promise" aria-labelledby="promise-title">
        <h2 id="promise-title" className="section-label">
          What happens to your file
        </h2>
        <ul className="promise-list">
          <li>
            <strong>Your file is deleted</strong> as soon as it has been read. Only the text is used.
          </li>
          <li>
            <strong>Without an account, nothing is kept.</strong> The reading lives in this tab until you close it.
          </li>
          <li>
            <strong>If you save a reading, it’s kept for 30 days</strong> and then deleted on its own. Pin it to keep it longer.
          </li>
          <li>
            <strong>“Delete everything”</strong> removes all of it, right away. We don’t sell or share your documents.
          </li>
        </ul>
        <Link className="link" href="/privacy">
          Read the privacy promise in full
        </Link>
      </section>
    </div>
  );
}

export default async function HomePage() {
  const viewer = await getViewer();
  return <UploadFlow loggedIn={!!viewer} hero={<Hero />} lower={<Lower />} />;
}
