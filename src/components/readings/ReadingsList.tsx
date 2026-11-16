"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/toast/ToastProvider";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { keepLine } from "@/hooks/useReadingActions";
import type { AnalysisListItem } from "@/lib/analyses";
import { DOC_TYPE_LABELS } from "@/lib/documents/types";
import { api, errorMessage } from "@/lib/client/api";
import { formatDay } from "@/lib/client/present";
import { DeleteEverything } from "./DeleteEverything";

export function ReadingsList({ initial }: { initial: AnalysisListItem[] }) {
  const router = useRouter();
  const toast = useToast();
  const [items, setItems] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<AnalysisListItem | null>(null);

  const togglePin = async (item: AnalysisListItem) => {
    setBusy(item.id);
    try {
      const { analysis } = await api<{ analysis: { pinned: boolean; expiresAt: string | null } }>(`/api/analyses/${item.id}`, {
        method: "PATCH",
        json: { pinned: !item.pinned },
      });
      setItems((list) => list.map((x) => (x.id === item.id ? { ...x, pinned: analysis.pinned, expiresAt: analysis.expiresAt } : x)));
      toast(analysis.pinned ? "Pinned. It won't be deleted on its own." : "Unpinned. It will be deleted automatically in 30 days.");
    } catch (err) {
      toast(errorMessage(err), { type: "error" });
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    if (!toDelete) return;
    setBusy(toDelete.id);
    try {
      await api(`/api/analyses/${toDelete.id}`, { method: "DELETE" });
      setItems((list) => list.filter((x) => x.id !== toDelete.id));
      toast("Deleted. The text of that document is gone from our servers.");
      setToDelete(null);
    } catch (err) {
      toast(errorMessage(err), { type: "error" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      {items.length === 0 ? (
        <div className="empty">
          <div className="empty-art" aria-hidden="true">
            <div className="ea-sheet ea-a">
              <i />
              <i />
              <i />
              <i />
            </div>
            <div className="ea-sheet ea-b">
              <span>+</span>
            </div>
          </div>
          <h2 className="h3">No saved readings yet</h2>
          <p className="muted">Read a document, then press “Save this reading”. Saved readings are deleted after 30 days unless you pin them.</p>
          <Link className="btn btn-primary" href="/">
            Read a document
          </Link>
        </div>
      ) : (
        <ul className="reading-list">
          {items.map((item, i) => (
            <li key={item.id} className="reading-card" style={{ ["--i" as string]: i }}>
              <div className="meta">
                <span className="badge badge-type">{DOC_TYPE_LABELS[item.docType]}</span>
                {item.flagCount > 0 && (
                  <span className="badge badge-amber">
                    {item.flagCount} to watch out for
                  </span>
                )}
              </div>
              <h2>
                <Link href={`/read/${item.id}`}>{item.title}</Link>
              </h2>
              <p className="when">
                Read on {formatDay(item.createdAt)} · {keepLine(item.pinned, item.expiresAt)}
              </p>
              <div className="card-actions">
                <button type="button" className="btn btn-small btn-ghost" aria-pressed={item.pinned} onClick={() => togglePin(item)} disabled={busy === item.id}>
                  {item.pinned ? "Pinned" : "Pin"}
                  <span className="sr-only"> {item.title}</span>
                </button>
                <button type="button" className="btn btn-small btn-ghost" onClick={() => setToDelete(item)} disabled={busy === item.id}>
                  Delete<span className="sr-only"> {item.title}</span>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <DeleteEverything
        onDone={(deletedAccount) => {
          setItems([]);
          if (deletedAccount) {
            router.push("/");
            router.refresh();
          }
        }}
      />
      <ConfirmDialog
        open={toDelete !== null}
        title="Delete this reading?"
        confirmLabel="Delete it"
        pending={busy !== null && busy === toDelete?.id}
        onClose={() => setToDelete(null)}
        onConfirm={remove}
      >
        <p>“{toDelete?.title}” and its text will be removed from our servers. You can’t undo this.</p>
      </ConfirmDialog>
    </>
  );
}
