import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/AuthForm";
import { safeNext } from "@/lib/client/next-path";
import { getViewer } from "../_lib/viewer";

export const metadata: Metadata = { title: "Create an account", robots: { index: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const { next } = await searchParams;
  const target = safeNext(typeof next === "string" ? next : undefined);
  if (await getViewer()) redirect(target);
  return <AuthForm mode="signup" next={target} />;
}
