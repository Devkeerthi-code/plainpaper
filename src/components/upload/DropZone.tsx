"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import { useTilt } from "@/hooks/useTilt";
import { useToast } from "@/components/toast/ToastProvider";
import { isImage, isPdf, MAX_PHOTOS, unsupportedMessage } from "@/lib/client/upload";
import { PhotoTray } from "./PhotoTray";

const ACCEPT = "application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif";

/** PDF goes straight in; photos collect in a tray so a phone user can add pages one by one. */
export function DropZone({ onFiles }: { onFiles: (files: File[]) => void }) {
  const toast = useToast();
  const { zoneRef, targetRef, lift } = useTilt<HTMLDivElement, HTMLLabelElement>();
  const [over, setOver] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const cameraRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const block = (e: Event) => e.preventDefault();
    window.addEventListener("dragover", block);
    window.addEventListener("drop", block);
    return () => {
      window.removeEventListener("dragover", block);
      window.removeEventListener("drop", block);
    };
  }, []);

  const take = (list: FileList | null) => {
    const files = Array.from(list ?? []);
    if (files.length === 0) return;
    const odd = files.find((f) => !isPdf(f) && !isImage(f));
    if (odd) {
      toast(unsupportedMessage(odd), { type: "error" });
      return;
    }
    if (files.some(isPdf)) {
      if (photos.length) toast("Reading the PDF on its own. Your photos were set aside.", { type: "info" });
      setPhotos([]);
      onFiles(files);
      return;
    }
    const next = [...photos, ...files];
    if (next.length > MAX_PHOTOS) toast(`Up to ${MAX_PHOTOS} pages at a time. Kept the first ${MAX_PHOTOS}.`, { type: "info" });
    setPhotos(next.slice(0, MAX_PHOTOS));
  };

  const onDrag = (e: DragEvent, entering: boolean) => {
    e.preventDefault();
    setOver(entering);
    lift.current(entering ? 14 : 0, entering ? undefined : -200);
  };

  return (
    <div className="land-drop" ref={zoneRef}>
      <div className="sheets" aria-hidden="true">
        <span />
        <span />
      </div>
      <label
        ref={targetRef}
        className={`drop${over ? " is-over" : ""}`}
        htmlFor="file-input"
        onDragEnter={(e) => onDrag(e, true)}
        onDragOver={(e) => onDrag(e, true)}
        onDragLeave={(e) => onDrag(e, false)}
        onDrop={(e) => {
          onDrag(e, false);
          take(e.dataTransfer.files);
        }}
      >
        <span className="drop-fold" aria-hidden="true" />
        <svg className="drop-icon" viewBox="0 0 48 48" aria-hidden="true">
          <path d="M24 31V13m0 0-7 7m7-7 7 7" />
          <path d="M10 31v5a2 2 0 0 0 2 2h24a2 2 0 0 0 2-2v-5" />
        </svg>
        <span className="drop-title">Drop your document here</span>
        <span className="drop-sub">One PDF, or photos of each page (up to {MAX_PHOTOS})</span>
        <span className="drop-actions">
          <span className="btn btn-primary">Choose a file</span>
          <button
            type="button"
            className="btn btn-quiet camera-btn"
            onClick={(e) => {
              e.preventDefault();
              cameraRef.current?.click();
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
              <circle cx="12" cy="13" r="3.5" />
            </svg>
            Take a photo
          </button>
        </span>
        <input
          id="file-input"
          className="sr-only"
          type="file"
          accept={ACCEPT}
          multiple
          onChange={(e) => {
            take(e.target.files);
            e.target.value = "";
          }}
        />
      </label>
      <input
        ref={cameraRef}
        className="sr-only"
        type="file"
        accept="image/*"
        capture="environment"
        tabIndex={-1}
        aria-label="Take a photo of a page"
        onChange={(e) => {
          take(e.target.files);
          e.target.value = "";
        }}
      />
      {photos.length > 0 && (
        <PhotoTray
          photos={photos}
          onRemove={(i) => setPhotos((p) => p.filter((_, j) => j !== i))}
          onAddPage={() => cameraRef.current?.click()}
          onRead={() => {
            onFiles(photos);
            setPhotos([]);
          }}
        />
      )}
    </div>
  );
}
