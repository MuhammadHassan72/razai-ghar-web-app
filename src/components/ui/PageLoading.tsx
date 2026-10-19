export default function PageLoading() {
  return (
    <div className="page-shell py-16" role="status">
      <p className="font-serif text-3xl">Gathering your layers…</p>
      <p className="mt-3 text-sm text-ink-muted">
        Loading current catalog and selections.
      </p>
    </div>
  );
}
