type Citation = { source: string; page?: number; section?: string };

export default function CitationCard({ citation }: { citation: Citation }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[rgba(4,16,11,0.78)] p-3 text-xs">
      <div className="font-medium text-[var(--accent)]">{citation.source || "Source"}</div>
      {citation.page ? <div className="mt-1 text-[var(--text-secondary)]">Page {citation.page}</div> : null}
      {citation.section ? (
        <div className="mt-0.5 text-[var(--text-muted)]">{citation.section}</div>
      ) : null}
    </div>
  );
}
