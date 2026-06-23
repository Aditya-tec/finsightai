"use client";

type Props = {
  tickers: string[];
  answer: string;
};

export default function CompareTable({ tickers, answer }: Props) {
  if (tickers.length < 2) return null;

  return (
    <div className="compare-table-wrap panel panel-elevated">
      <div className="panel-head">
        <span>Comparison</span>
        <span className="compare-tickers">{tickers.join(" · ")}</span>
      </div>
      <div className="panel-body compare-table-body">
        <p className="compare-hint">Multi-company analysis — see detailed answer below.</p>
        <table className="compare-table">
          <thead>
            <tr>
              <th>Company</th>
              <th>Ticker</th>
            </tr>
          </thead>
          <tbody>
            {tickers.map((t) => (
              <tr key={t}>
                <td>{t}</td>
                <td>{t}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
