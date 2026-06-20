import { formatGroupedCitations } from "@/lib/citations";

type Section = {
  title: string;
  body: string;
  citations: Array<{ source: string; page?: number; section?: string }>;
};

export default function ReportView({ sections, loading }: { sections: Section[]; loading?: boolean }) {
  if (loading && sections.length === 0) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="terminal-card animate-pulse">
            <div className="mb-2 h-4 w-1/3 rounded bg-[var(--border)]" />
            <div className="space-y-2">
              <div className="h-3 w-full rounded bg-[var(--border)]" />
              <div className="h-3 w-5/6 rounded bg-[var(--border)]" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (sections.length === 0) {
    return (
      <div className="terminal-card py-8 text-center text-sm text-[var(--text-muted)]">
        Report sections will appear here.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sections.map((section, index) => (
        <article key={section.title} className="terminal-card">
          <div className="terminal-header mb-3">
            <span className="terminal-title">Section {index + 1}</span>
            <span className="terminal-chip">Cited</span>
          </div>
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[rgba(53,240,138,0.12)] text-xs font-bold text-[var(--accent)]">
              {index + 1}
            </span>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">{section.title}</h3>
          </div>
          <p className="mb-3 whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-secondary)]">
            {section.body}
          </p>
          {section.citations?.length > 0 && (
            <p className="text-xs text-[var(--text-muted)]">
              <span className="font-semibold text-[var(--accent)]">Sources: </span>
              {formatGroupedCitations(section.citations)}
            </p>
          )}
        </article>
      ))}
    </div>
  );
}
