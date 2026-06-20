"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  disabled?: boolean;
  loading?: boolean;
  loadingLabel?: string;
  onExportFull: () => void;
  onExportBullet: () => void;
};

export default function ExportPdfMenu({
  disabled,
  loading,
  loadingLabel,
  onExportFull,
  onExportBullet,
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (ref.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  return (
    <div className="export-pdf-menu" ref={ref}>
      <button
        type="button"
        className="btn-ghost export-pdf-trigger"
        style={{ padding: "7px 14px" }}
        disabled={disabled || loading}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {loading ? loadingLabel ?? "Exporting..." : "Export PDF"}
        {!loading && <span className="export-pdf-chevron">{open ? "▴" : "▾"}</span>}
      </button>
      {open && !loading && (
        <div className="export-pdf-dropdown" role="menu">
          <button
            type="button"
            role="menuitem"
            className="export-pdf-option"
            onClick={() => {
              setOpen(false);
              onExportFull();
            }}
          >
            Export Full Report
          </button>
          <button
            type="button"
            role="menuitem"
            className="export-pdf-option"
            onClick={() => {
              setOpen(false);
              onExportBullet();
            }}
          >
            Export Bullet Summary
          </button>
        </div>
      )}
    </div>
  );
}
