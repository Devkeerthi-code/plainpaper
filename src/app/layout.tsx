import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { HeaderNav } from "@/components/chrome/HeaderNav";
import { SiteFooter } from "@/components/chrome/SiteFooter";
import { ToastProvider } from "@/components/toast/ToastProvider";
import { cookies } from "next/headers";
import { isThemeChoice, THEME_KEY } from "@/lib/client/theme";
import { getViewer } from "./_lib/viewer";
import { fontVariables } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "PlainPaper — the fine print, made plain", template: "%s · PlainPaper" },
  description:
    "PlainPaper reads job offer letters, rent agreements and health insurance policies and explains them in plain words, in English or seven Indian languages, before you sign.",
  applicationName: "PlainPaper",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F5F1E8" },
    { media: "(prefers-color-scheme: dark)", color: "#14161B" },
  ],
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const [viewer, jar] = await Promise.all([getViewer(), cookies()]);
  const theme = jar.get(THEME_KEY)?.value;
  return (
    <html lang="en" className={fontVariables} data-theme={isThemeChoice(theme) ? theme : undefined} suppressHydrationWarning>
      <body>
        <ToastProvider>
          <a className="skip" href="#main">
            Skip to content
          </a>
          <HeaderNav loggedIn={!!viewer} />
          <main id="main" className="site-main" tabIndex={-1}>
            {children}
          </main>
          <SiteFooter />
        </ToastProvider>
      </body>
    </html>
  );
}
