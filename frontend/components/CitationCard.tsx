import type { Citation } from "@/lib/citations";
import { sourcePageHref } from "@/lib/citations";

type Props = {
  citation: Citation;
};

export default function CitationCard({ citation }: Props) {
  const ticker = citation.ticker?.toUpperCase();
  const fy = citation.fiscal_year ?? "FY25";
  const linkable = citation.page != null && ticker && citation.page_valid !== false;

  return (
    <div className="citation-card">
      <div className="citation-card-source">{citation.source || "filing"}</div>
      {linkable ? (
        <a
          href={sourcePageHref(ticker, citation.page!, fy, citation.section)}
          className="citation-card-page"
          title={citation.page_mismatch ? "Nearest parsed page" : undefined}
        >
          Page {citation.page}
          {citation.page_mismatch ? " (approx.)" : ""}
        </a>
      ) : citation.page ? (
        <div className="citation-card-page">Page {citation.page}</div>
      ) : null}
      {citation.section ? <div className="citation-card-section">{citation.section}</div> : null}
    </div>
  );
}
