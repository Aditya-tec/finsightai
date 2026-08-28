"use client";

import FormattedText from "@/components/FormattedText";
import { companyDisplayName } from "@/lib/companyNames";
import type { CompareData } from "@/lib/compareTypes";

type Props = {
  tickers: string[];
  comparison: CompareData;
  companies?: Array<{ ticker: string; name: string }>;
};

export default function CompareTable({ tickers, comparison, companies }: Props) {
  const columns = tickers.length > 0 ? tickers : Object.keys(comparison.metrics[0]?.values ?? {});

  return (
    <div className="compare-table-wrap panel panel-elevated">
      <div className="panel-head">
        <span>Comparison</span>
        <span className="compare-tickers">{columns.join(" · ")}</span>
      </div>
      <div className="panel-body compare-table-body">
        <p className="compare-summary">
          <FormattedText text={comparison.summary} />
        </p>

        <div className="compare-table-scroll">
          <table className="compare-table">
            <thead>
              <tr>
                <th className="compare-metric-col">Metric</th>
                {columns.map((ticker) => (
                  <th key={ticker}>{companyDisplayName(ticker, companies)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparison.metrics.map((metric) => (
                <tr key={metric.label}>
                  <td className="compare-metric-col">
                    <span className="compare-metric-label">{metric.label}</span>
                    {metric.note ? <span className="compare-metric-note">{metric.note}</span> : null}
                  </td>
                  {columns.map((ticker) => (
                    <td key={`${metric.label}-${ticker}`}>
                      <FormattedText text={metric.values[ticker] ?? "—"} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {comparison.takeaways && comparison.takeaways.length > 0 ? (
          <div className="compare-takeaways">
            <h3 className="compare-takeaways-title">Key takeaways</h3>
            <ul>
              {comparison.takeaways.map((item) => (
                <li key={item}>
                  <FormattedText text={item} />
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
