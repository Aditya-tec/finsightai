import type { Citation } from "@/lib/citations";

type Props = {
  citation: Citation;
};

export default function CitationCard({ citation }: Props) {
  const ticker = citation.ticker?.toUpperCase();
  const fy = citation.fiscal_year ?? "FY25";

  return (
    <div className="citation-card">
      <div className="citation-card-source">{citation.source || "filing"}</div>
      {citation.page != null && ticker ? (
        <a
          href={`/source/${ticker}?page=${citation.page}&fiscal_year=${encodeURIComponent(fy)}`}
          className="citation-card-page"
        >
          Page {citation.page}
        </a>
      ) : citation.page ? (
        <div className="citation-card-page">Page {citation.page}</div>
      ) : null}
      {citation.section ? <div className="citation-card-section">{citation.section}</div> : null}
    </div>
  );
}
