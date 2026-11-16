"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api, errorMessage } from "@/lib/client/api";
import { useToast } from "@/components/toast/ToastProvider";
import { BrandMark } from "./BrandMark";
import { ThemeToggle } from "./ThemeToggle";

const LINKS = [
  { href: "/", label: "Read a document", match: (p: string) => p === "/" || p.startsWith("/read") },
  { href: "/compare", label: "Compare", match: (p: string) => p.startsWith("/compare") },
  { href: "/pay", label: "In-hand pay", match: (p: string) => p.startsWith("/pay") },
];

export function HeaderNav({ loggedIn }: { loggedIn: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const menuBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        menuBtn.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const logout = async () => {
    setLeaving(true);
    try {
      await api("/api/auth/logout", { method: "POST" });
      router.push("/");
      router.refresh();
      toast("Logged out. Readings you saved are still in your account.");
    } catch (err) {
      toast(errorMessage(err), { type: "error" });
    } finally {
      setLeaving(false);
    }
  };

  const current = (match: (p: string) => boolean) => (match(pathname) ? ("page" as const) : undefined);

  return (
    <header className="topbar">
      <Link className="brand" href="/" aria-label="PlainPaper, home">
        <BrandMark />
        <span className="brand-word">PlainPaper</span>
      </Link>
      <button
        ref={menuBtn}
        type="button"
        className="icon-btn menu-btn"
        aria-expanded={open}
        aria-controls="site-nav"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((o) => !o)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h10" />}
        </svg>
      </button>
      <nav id="site-nav" className={`nav${open ? " is-open" : ""}`} aria-label="Main">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} aria-current={current(l.match)}>
            {l.label}
          </Link>
        ))}
        <span className="nav-sep" aria-hidden="true" />
        {loggedIn ? (
          <>
            <Link href="/readings" aria-current={current((p) => p.startsWith("/readings"))}>
              My readings
            </Link>
            <button type="button" className="nav-btn" onClick={logout} disabled={leaving}>
              {leaving ? "Logging out…" : "Log out"}
            </button>
          </>
        ) : (
          <Link href={`/login?next=${encodeURIComponent(pathname)}`} aria-current={current((p) => p === "/login")}>
            Log in
          </Link>
        )}
      </nav>
      <ThemeToggle />
    </header>
  );
}
