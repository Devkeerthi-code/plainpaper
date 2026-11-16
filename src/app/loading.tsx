export default function Loading() {
  return (
    <div className="page-wrap" aria-busy="true" aria-label="Loading">
      <div style={{ display: "grid", gap: 16, maxWidth: 560 }}>
        <span className="shimmer" style={{ height: 12, width: 120 }} />
        <span className="shimmer" style={{ height: 40, width: "80%" }} />
        <span className="shimmer" style={{ height: 16 }} />
        <span className="shimmer" style={{ height: 16, width: "60%" }} />
      </div>
    </div>
  );
}
