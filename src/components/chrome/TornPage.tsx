import type { ReactNode } from "react";

/** A torn sheet: used for 404s, errors and readings that are gone. */
export function TornPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="notfound">
      <div>
        <div className="notfound-art" aria-hidden="true">
          <div className="torn">
            <i />
            <i />
            <i />
            <i />
          </div>
          <div className="scrap" />
        </div>
        <h1 className="display">{title}</h1>
        {children}
      </div>
    </div>
  );
}
