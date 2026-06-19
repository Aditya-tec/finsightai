"use client";

type Props = {
  steps?: string[];
  loading?: boolean;
  idle?: React.ReactNode;
};

export default function LiveFeed({ steps = [], loading, idle }: Props) {
  return (
    <aside className="panel panel-right">
      <div className="feed-header">{"// LIVE FEED"}</div>
      <div className="feed-body">
        {steps.length === 0 ? (
          idle ?? (
            <div className="feed-idle">
              {loading ? (
                <>
                  <div className="feed-line active">&gt; booting agent pipeline...</div>
                  <div className="feed-line">&gt; waiting for events...</div>
                </>
              ) : (
                <>
                  <div>waiting for events...</div>
                  <br />
                  <div>Select a company and run a query to start.</div>
                </>
              )}
            </div>
          )
        ) : (
          steps.map((s, i) => (
            <div
              key={`${s}-${i}`}
              className={`feed-line ${i === steps.length - 1 && loading ? "active" : "done"}`}
            >
              &gt; {s}
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
