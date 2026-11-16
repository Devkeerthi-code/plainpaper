"use client";

import { useState } from "react";
import { useToast } from "@/components/toast/ToastProvider";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { api, errorMessage } from "@/lib/client/api";

/** "Delete everything": every saved reading, and the account too if they tick the box. */
export function DeleteEverything({ onDone }: { onDone: (deletedAccount: boolean) => void }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [withAccount, setWithAccount] = useState(false);
  const [pending, setPending] = useState(false);

  const confirm = async () => {
    setPending(true);
    try {
      await api("/api/me", { method: "DELETE", json: { deleteAccount: withAccount } });
      setOpen(false);
      onDone(withAccount);
      toast(withAccount ? "Your account and every reading are deleted." : "Every saved reading is deleted. Your account is still here.");
    } catch (err) {
      toast(errorMessage(err), { type: "error" });
    } finally {
      setPending(false);
    }
  };

  return (
    <section className="danger-zone" aria-labelledby="delete-all-title">
      <div>
        <h2 id="delete-all-title" className="section-label">
          Delete everything
        </h2>
        <p>Removes every saved reading from our servers right away. You can also delete your account in the same step.</p>
      </div>
      <button type="button" className="btn btn-quiet" onClick={() => setOpen(true)}>
        Delete everything…
      </button>
      <ConfirmDialog
        open={open}
        title="Delete everything?"
        confirmLabel={withAccount ? "Delete readings and account" : "Delete all readings"}
        pending={pending}
        onClose={() => setOpen(false)}
        onConfirm={confirm}
      >
        <p>This removes all your saved readings, including pinned ones. You can’t undo this.</p>
        <label className="check">
          <input type="checkbox" checked={withAccount} onChange={(e) => setWithAccount(e.target.checked)} />
          <span>Also delete my account</span>
        </label>
      </ConfirmDialog>
    </section>
  );
}
