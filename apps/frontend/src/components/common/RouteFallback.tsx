export function RouteFallback() {
  return (
    <div className="loading-wrap" aria-busy="true" aria-live="polite">
      <div className="spinner" />
    </div>
  );
}
