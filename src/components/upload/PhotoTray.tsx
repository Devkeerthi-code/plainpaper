"use client";

import { useEffect, useMemo } from "react";

interface Props {
  photos: File[];
  onRemove: (index: number) => void;
  onAddPage: () => void;
  onRead: () => void;
}

export function PhotoTray({ photos, onRemove, onAddPage, onRead }: Props) {
  const urls = useMemo(() => photos.map((f) => URL.createObjectURL(f)), [photos]);
  useEffect(() => () => urls.forEach((u) => URL.revokeObjectURL(u)), [urls]);
  const n = photos.length;

  return (
    <section className="tray" aria-label="Pages ready to read">
      <p className="small">
        <strong>
          {n} page{n === 1 ? "" : "s"} ready.
        </strong>{" "}
        Add every page in order, then read them together.
      </p>
      <ol className="tray-pages">
        {urls.map((url, i) => (
          <li key={url} style={{ backgroundImage: `url(${url})` }}>
            <span>p.{i + 1}</span>
            <button type="button" onClick={() => onRemove(i)} aria-label={`Remove page ${i + 1}`}>
              <svg viewBox="0 0 12 12" aria-hidden="true">
                <path d="M3 3l6 6M9 3 3 9" />
              </svg>
            </button>
          </li>
        ))}
      </ol>
      <div className="tray-actions">
        <button type="button" className="btn btn-primary" onClick={onRead}>
          Read {n} page{n === 1 ? "" : "s"}
        </button>
        <button type="button" className="btn btn-quiet camera-btn" onClick={onAddPage}>
          Add another page
        </button>
        <label className="btn btn-ghost" htmlFor="file-input">
          Add from gallery
        </label>
      </div>
    </section>
  );
}
