import { NextResponse } from "next/server";
import { deleteEverything } from "@/lib/analyses";
import { deleteEverythingSchema } from "@/lib/api-schemas";
import { destroySession } from "@/lib/auth/session";
import { readJson } from "@/lib/http/request";
import { requireUser, route } from "@/lib/http/route";
import { track } from "@/lib/usage";

export const runtime = "nodejs";

/** "Delete everything": all saved readings, and optionally the account itself. */
export const DELETE = route(async (req) => {
  const user = await requireUser();
  const { deleteAccount } = deleteEverythingSchema.parse(await readJson(req, 1_000));
  await deleteEverything(user.id, deleteAccount);
  if (deleteAccount) await destroySession();
  await track("delete_everything");
  return NextResponse.json({ ok: true, deletedAccount: deleteAccount });
});
