/** Layout-matching placeholder while a reading loads. */
export function ReadingSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading the reading">
      <div className="docbar">
        <span className="shimmer" style={{ width: 240, height: 14 }} />
      </div>
      <div className="read">
        <div className="doc-pane">
          <div className="doc-inner" style={{ paddingTop: 32 }}>
            <div className="page" style={{ display: "grid", gap: 12 }}>
              {Array.from({ length: 12 }, (_, i) => (
                <span key={i} className="shimmer" style={{ height: 10, width: i % 4 === 3 ? "62%" : "100%" }} />
              ))}
            </div>
          </div>
        </div>
        <div className="plain-pane">
          <div className="plain-inner" style={{ display: "grid", gap: 14, paddingTop: 32 }}>
            <span className="shimmer" style={{ height: 12, width: "30%" }} />
            <span className="shimmer" style={{ height: 18 }} />
            <span className="shimmer" style={{ height: 18, width: "80%" }} />
            {Array.from({ length: 6 }, (_, i) => (
              <span key={i} className="shimmer" style={{ height: 40 }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
