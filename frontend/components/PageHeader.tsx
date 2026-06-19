import Link from "next/link";

type Props = {
  title: string;
  subtitle?: string;
  badge?: string;
};

export default function PageHeader({ title, subtitle, badge }: Props) {
  return (
    <header className="space-y-4">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-emerald-500/85 transition hover:text-emerald-300"
      >
        <span>←</span>
        <span>Back to Terminal</span>
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)] md:text-3xl">
          {title}
        </h1>
        {badge ? <span className="terminal-chip">{badge}</span> : null}
      </div>
      {subtitle ? <p className="max-w-3xl text-sm leading-relaxed muted">{subtitle}</p> : null}
    </header>
  );
}
