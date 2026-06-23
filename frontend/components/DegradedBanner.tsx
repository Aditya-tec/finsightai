"use client";

type Props = {
  message?: string;
};

export default function DegradedBanner({
  message = "Live search unavailable — answering from cached report context.",
}: Props) {
  return (
    <div className="degraded-banner panel-body" role="status">
      {message}
    </div>
  );
}
