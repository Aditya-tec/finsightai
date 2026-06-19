"use client";

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export default function SearchBar({ value, onChange }: Props) {
  return (
    <div className="terminal-card">
      <div className="terminal-header">
        <span className="terminal-title">Query</span>
        <span className="terminal-value">Ticker Search</span>
      </div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="> search company name or ticker..."
        className="input"
      />
    </div>
  );
}
