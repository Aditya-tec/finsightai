"use client";

type Props = {
  label?: string;
};

export default function LoadingDots({ label }: Props) {
  return (
    <span className="loading-dots-wrap">
      {label && <span>{label}</span>}
      <span className="loading-dots" aria-hidden>
        <span />
        <span />
        <span />
      </span>
    </span>
  );
}
