"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADVICE_TEXT } from "./BrandMark";

/** Hidden on the reading screens, which carry the fixed not-advice strip instead. */
export function SiteFooter() {
  const pathname = usePathname();
  if (pathname.startsWith("/read/")) return null;
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <p>{ADVICE_TEXT}</p>
        <nav aria-label="Footer">
          <Link href="/privacy">Privacy, in plain words</Link>
          <Link href="/pay">In-hand pay calculator</Link>
        </nav>
      </div>
    </footer>
  );
}
